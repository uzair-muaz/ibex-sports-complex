import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Booking from "@/models/Booking";
import "@/models/Court";
import { notify } from "@/lib/notifications";
import { bookingReference, bookingStartMs } from "@/lib/api/booking-view";

/**
 * The messages customers get, one function per event. Each is safe to call
 * more than once (dedupe keys) and never throws. Never include bank or
 * payment details in a message.
 */

const pkr = (n: number) => `PKR ${Math.round(n).toLocaleString("en-PK")}`;

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** "Wed 18 Nov, 6:00 pm" in Pakistan time. */
export function startLabel(ms: number) {
  return new Date(ms).toLocaleString("en-GB", {
    timeZone: "Asia/Karachi",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

type Facts = {
  id: string;
  userId: string | null;
  email: string;
  name: string;
  reference: string;
  courtName: string;
  when: string;
  startMs: number;
  status: string;
};

async function bookingFacts(bookingId: string | mongoose.Types.ObjectId): Promise<Facts | null> {
  await connectDB();
  const b = await Booking.findById(bookingId)
    .select("userId userEmail userName serialNumber date startTime status courtId")
    .populate("courtId", "name")
    .lean();
  if (!b) return null;
  const startMs = bookingStartMs(b.date, b.startTime);
  return {
    id: b._id.toString(),
    userId: b.userId ? b.userId.toString() : null,
    email: b.userEmail,
    name: b.userName || "there",
    reference: bookingReference(b as never),
    courtName: (b.courtId as { name?: string } | null)?.name || "your court",
    when: startLabel(startMs),
    startMs,
    status: b.status,
  };
}

function emailHtml(f: Facts, heading: string, lines: string[]) {
  return `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#111">
  <h2 style="margin:0 0 12px">${esc(heading)}</h2>
  <p>Hi ${esc(f.name)},</p>
  ${lines.map((l) => `<p>${esc(l)}</p>`).join("\n  ")}
  <p style="color:#555">${esc(f.reference)} · ${esc(f.courtName)} · ${esc(f.when)}</p>
  <p style="color:#888;font-size:12px">IBEX Sports Complex</p>
</div>`;
}

/** App booking made (the website path already sends its own confirmation email). Email only. */
export async function notifyBookingReceived(bookingId: string | mongoose.Types.ObjectId) {
  const f = await bookingFacts(bookingId);
  if (!f) return;
  const reserved = f.status === "pending_payment";
  const lines = reserved
    ? ["We've reserved your booking.", "Please send the advance and upload the payment screenshot in the IBEX app. We'll confirm once we've checked it."]
    : ["Your booking is confirmed. See you on court!"];
  await notify({
    userId: f.userId,
    type: null,
    title: "Booking received",
    body: lines.join(" "),
    bookingId: f.id,
    email: { to: f.email, subject: `Booking received · ${f.reference}`, html: emailHtml(f, "Booking received", lines) },
  });
}

/** Customer uploaded a payment screenshot. In-app + push. */
export async function notifyProofSubmitted(params: { bookingId: string; proofId: string; amount: number }) {
  const f = await bookingFacts(params.bookingId);
  if (!f?.userId) return;
  await notify({
    userId: f.userId,
    type: "proof_submitted",
    title: "Payment screenshot received",
    body: `We received your screenshot for ${f.reference}. We'll check it and let you know.`,
    bookingId: f.id,
    amount: params.amount,
    dedupeKey: `proof_submitted:${params.proofId}`,
  });
}

/** Staff verified money. In-app + push + email. */
export async function notifyPaymentVerified(params: { bookingId: string; proofId: string; amount: number }) {
  const f = await bookingFacts(params.bookingId);
  if (!f || f.status === "cancelled") return;
  const confirmed = f.status === "confirmed" || f.status === "completed";
  const body = confirmed
    ? `We received ${pkr(params.amount)} for ${f.reference}. Your booking is confirmed.`
    : `We received ${pkr(params.amount)} for ${f.reference}. A little more is needed to confirm it.`;
  await notify({
    userId: f.userId,
    type: "payment_verified",
    title: confirmed ? "Payment verified · booking confirmed" : "Payment verified",
    body,
    bookingId: f.id,
    amount: params.amount,
    dedupeKey: `payment_verified:${params.proofId}`,
    email: { to: f.email, subject: `Payment verified · ${f.reference}`, html: emailHtml(f, "Payment verified", [body]) },
  });
}

/** Staff rejected a screenshot. In-app + push + email. */
export async function notifyProofRejected(params: { bookingId: string; proofId: string; reason: string }) {
  const f = await bookingFacts(params.bookingId);
  if (!f || f.status === "cancelled") return;
  const body = `We couldn't accept your screenshot for ${f.reference}: ${params.reason}. Please send a new one in the app.`;
  await notify({
    userId: f.userId,
    type: "proof_rejected",
    title: "Payment screenshot not accepted",
    body,
    bookingId: f.id,
    dedupeKey: `proof_rejected:${params.proofId}`,
    email: { to: f.email, subject: `Payment screenshot not accepted · ${f.reference}`, html: emailHtml(f, "Payment screenshot not accepted", [body]) },
  });
}

/** Booking cancelled by the customer or the venue. In-app + push + email. */
export async function notifyBookingCancelled(params: {
  bookingId: string | mongoose.Types.ObjectId;
  by: "customer" | "venue";
  refundAmount?: number;
}) {
  const f = await bookingFacts(params.bookingId);
  if (!f) return;
  const lines = [
    params.by === "customer" ? `Your booking ${f.reference} is cancelled.` : `The venue cancelled your booking ${f.reference}.`,
  ];
  if ((params.refundAmount ?? 0) > 0) lines.push(`${pkr(params.refundAmount!)} has been added to your IBEX wallet.`);
  const body = lines.join(" ");
  await notify({
    userId: f.userId,
    type: "booking_cancelled",
    title: "Booking cancelled",
    body,
    bookingId: f.id,
    amount: params.refundAmount || null,
    dedupeKey: `booking_cancelled:${f.id}`,
    email: { to: f.email, subject: `Booking cancelled · ${f.reference}`, html: emailHtml(f, "Booking cancelled", lines) },
  });
}

/** Money added to the wallet. In-app + push. `refKey` is the wallet entry's key. */
export async function notifyWalletCredited(params: {
  userId: string | mongoose.Types.ObjectId;
  amount: number;
  balance: number;
  refKey: string;
  bookingId?: string | mongoose.Types.ObjectId | null;
}) {
  await notify({
    userId: params.userId,
    type: "wallet_credited",
    title: "Wallet credited",
    body: `${pkr(params.amount)} was added to your IBEX wallet. Balance: ${pkr(params.balance)}.`,
    bookingId: params.bookingId ?? null,
    amount: params.amount,
    dedupeKey: `wallet_credited:${params.refKey}`,
  });
}

/** Points credited after a match. In-app + push. */
export async function notifyPointsEarned(params: {
  userId: string | mongoose.Types.ObjectId;
  points: number;
  bookingId: string | mongoose.Types.ObjectId;
}) {
  await notify({
    userId: params.userId,
    type: "points_earned",
    title: "Points earned",
    body: `You earned ${params.points} points for your match. Thanks for playing!`,
    bookingId: params.bookingId,
    dedupeKey: `points_earned:${params.bookingId.toString()}`,
  });
}

/** 2 hours before the match. In-app + push + email. */
export async function notifyBookingReminder(bookingId: string | mongoose.Types.ObjectId) {
  const f = await bookingFacts(bookingId);
  if (!f) return;
  const lines = [`Your match at ${f.courtName} starts at ${startLabel(f.startMs).split(", ").pop()}. See you soon!`];
  if (f.status === "pending_payment") lines.push("Your advance payment hasn't been confirmed yet. Please bring proof of payment.");
  const body = lines.join(" ");
  await notify({
    userId: f.userId,
    type: "booking_reminder",
    title: "Your match is in 2 hours",
    body,
    bookingId: f.id,
    dedupeKey: `booking_reminder:${f.id}`,
    email: { to: f.email, subject: `Reminder: your match today · ${f.reference}`, html: emailHtml(f, "Your match is in 2 hours", lines) },
  });
}
