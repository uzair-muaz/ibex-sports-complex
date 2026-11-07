import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Booking from "@/models/Booking";
import { getAppSettings } from "@/lib/app-settings";
import { hashToken } from "@/lib/api/create-app-booking";
import { splitBookings } from "@/lib/api/my-bookings";
import { proofsByBooking } from "@/lib/payments/proofs";
import { toMobileBooking, type BookingSource, type MobileBooking } from "@/lib/api/booking-view";

export const MAX_GUEST_TOKENS = 50;
const TOKEN_RE = /^gt_[A-Za-z0-9_-]{20,64}$/;

/**
 * Guest codes the phone sent: `X-Guest-Tokens: gt_1,gt_2` (and/or a single
 * `X-Guest-Token`). Anything that doesn't look like a code is ignored.
 */
export function guestTokensFrom(request: Request): string[] {
  const raw = [request.headers.get("x-guest-tokens") || "", request.headers.get("x-guest-token") || ""].join(",");
  return parseGuestTokens(raw);
}

export function parseGuestTokens(raw: string): string[] {
  const seen = new Set<string>();
  for (const part of raw.split(",")) {
    const t = part.trim();
    if (TOKEN_RE.test(t)) seen.add(t);
    if (seen.size >= MAX_GUEST_TOKENS) break;
  }
  return [...seen];
}

/** Only bookings still held as a guest: once claimed by an account, the code stops working. */
function guestFilter(tokens: string[]) {
  return {
    guestAccessTokenHash: { $in: tokens.map(hashToken) },
    $or: [{ userId: { $exists: false } }, { userId: null }],
  };
}

async function toViews(rows: BookingSource[], now = Date.now()) {
  const settings = await getAppSettings();
  const proofs = await proofsByBooking(rows.map((r) => r._id.toString()));
  return rows.map((b) =>
    toMobileBooking(b, {
      cancellationNoticeMinutes: settings.cancellationNoticeMinutes,
      minAdvancePercent: settings.payments.minAdvancePercent,
      now,
      proofs: proofs.get(b._id.toString()) ?? [],
    }),
  );
}

/** Guest bookings for the codes on this phone: upcoming (soonest first), then past (newest first). */
export async function listGuestBookings(tokens: string[]): Promise<MobileBooking[]> {
  if (tokens.length === 0) return [];
  await connectDB();
  const rows = (await Booking.find(guestFilter(tokens))
    .populate("courtId", "name type")
    .lean()) as unknown as BookingSource[];
  const now = Date.now();
  const { upcoming, past } = splitBookings(rows, now);
  return toViews([...upcoming, ...past], now);
}

/** One guest booking, only if one of the codes belongs to it. */
export async function getGuestBooking(bookingId: string, tokens: string[]): Promise<MobileBooking | null> {
  if (tokens.length === 0 || !mongoose.isValidObjectId(bookingId)) return null;
  await connectDB();
  const row = await Booking.findOne({ _id: bookingId, ...guestFilter(tokens) })
    .populate("courtId", "name type")
    .lean();
  if (!row) return null;
  const [view] = await toViews([row as unknown as BookingSource]);
  return view;
}
