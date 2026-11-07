import crypto from "crypto";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Booking from "@/models/Booking";
import PaymentProof, { type IPaymentProof } from "@/models/PaymentProof";
import { getFileStorage } from "@/lib/storage";
import { toPkIso } from "@/lib/api/time";
import { getBaseUrl } from "@/lib/utils";
import { creditWallet } from "@/lib/wallet";

export const MAX_PROOF_BYTES = 5 * 1024 * 1024;
export const MAX_PROOFS_PER_BOOKING = 10;
const LINK_TTL_SECONDS = 60 * 60;

export type ProofFileType = "jpg" | "png" | "pdf";

const CONTENT_TYPES: Record<ProofFileType, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  pdf: "application/pdf",
};

/** Look at the first bytes, not the file name, to know what the file really is. */
export function detectFileType(data: Uint8Array): ProofFileType | null {
  if (data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return "jpg";
  if (
    data.length >= 8 &&
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((b, i) => data[i] === b)
  ) {
    return "png";
  }
  if (data.length >= 5 && Buffer.from(data.subarray(0, 5)).toString("latin1") === "%PDF-") return "pdf";
  return null;
}

export function contentTypeFor(type: ProofFileType): string {
  return CONTENT_TYPES[type];
}

function linkSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET || process.env.API_JWT_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET is not set");
  return secret;
}

export function signFileLink(proofId: string, exp: number, secret = linkSecret()): string {
  return crypto.createHmac("sha256", secret).update(`proof:${proofId}:${exp}`).digest("base64url");
}

/** Check a signed link: right signature and not expired. */
export function verifyFileLink(
  proofId: string,
  exp: number,
  sig: string,
  now = Date.now(),
  secret = linkSecret(),
): boolean {
  if (!Number.isFinite(exp) || exp * 1000 < now) return false;
  const expected = Buffer.from(signFileLink(proofId, exp, secret));
  const given = Buffer.from(sig);
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}

/** Short-lived link the app can show in an image widget. */
export function proofFileUrl(proofId: string, now = Date.now()): string {
  const exp = Math.floor(now / 1000) + LINK_TTL_SECONDS;
  const sig = signFileLink(proofId, exp);
  return `${getBaseUrl().replace(/\/$/, "")}/api/v1/payment-proofs/${proofId}/file?exp=${exp}&sig=${sig}`;
}

type ProofLike = Pick<
  IPaymentProof,
  | "amount"
  | "status"
  | "source"
  | "transferReference"
  | "transferredAt"
  | "verifiedAmount"
  | "rejectionReason"
  | "fileKey"
  | "fileType"
  | "createdAt"
> & { _id: { toString(): string } };

export type MobileProof = {
  id: string;
  amount: number;
  status: IPaymentProof["status"];
  source: IPaymentProof["source"];
  submittedAt: string | null;
  imageUrl: string | null;
  fileType: ProofFileType | null;
  transferReference: string | null;
  transferredAt: string | null;
  verifiedAmount: number | null;
  rejectionReason: string | null;
};

export function toMobileProof(p: ProofLike): MobileProof {
  const id = p._id.toString();
  return {
    id,
    amount: p.amount,
    status: p.status,
    source: p.source,
    submittedAt: toPkIso(p.createdAt ?? null),
    imageUrl: p.fileKey ? proofFileUrl(id) : null,
    fileType: p.fileType ?? null,
    transferReference: p.transferReference ?? null,
    transferredAt: toPkIso(p.transferredAt ?? null),
    verifiedAmount: p.status === "verified" ? (p.verifiedAmount ?? p.amount) : null,
    rejectionReason: p.status === "rejected" ? (p.rejectionReason ?? null) : null,
  };
}

/** All proofs for some bookings, oldest first, grouped by booking id. */
export async function proofsByBooking(bookingIds: Array<string | mongoose.Types.ObjectId>) {
  const map = new Map<string, MobileProof[]>();
  if (bookingIds.length === 0) return map;
  await connectDB();
  const rows = await PaymentProof.find({ bookingId: { $in: bookingIds } }).sort({ createdAt: 1 }).lean();
  for (const r of rows) {
    const key = r.bookingId.toString();
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(toMobileProof(r as unknown as ProofLike));
  }
  return map;
}

/** The advance this booking needs (old website bookings: worked out from the %). */
export function advanceFor(
  b: { advanceRequired?: number | null; totalPrice: number },
  minAdvancePercent: number,
): number {
  if (typeof b.advanceRequired === "number") return b.advanceRequired;
  return Math.ceil((Math.round(b.totalPrice) * minAdvancePercent) / 100);
}

export type ProofError = { ok: false; status: number; code: string; error: string };

/** Read and check an uploaded file. */
export async function readProofFile(
  file: FormDataEntryValue | null,
): Promise<{ ok: true; data: Buffer; type: ProofFileType } | ProofError> {
  const bad = (error: string): ProofError => ({ ok: false, status: 400, code: "INVALID_FILE", error });
  if (!file || typeof file === "string") return bad("Please attach the transfer screenshot (JPG, PNG or PDF).");
  if (file.size === 0) return bad("The file is empty.");
  if (file.size > MAX_PROOF_BYTES) return bad("The file is too big. The limit is 5 MB.");
  const data = Buffer.from(await file.arrayBuffer());
  const type = detectFileType(data);
  if (!type) return bad("Only JPG, PNG or PDF files are accepted.");
  return { ok: true, data, type };
}

/** Whole PKR from a form field. */
export function parseAmount(raw: FormDataEntryValue | unknown): number | null {
  const n = typeof raw === "string" ? Number(raw.trim()) : typeof raw === "number" ? raw : NaN;
  if (!Number.isFinite(n) || n <= 0 || n > 10_000_000) return null;
  return Math.round(n);
}

async function saveFile(bookingId: string, data: Buffer, type: ProofFileType) {
  const storage = getFileStorage();
  if (!storage) {
    return {
      ok: false as const,
      status: 503,
      code: "STORAGE_NOT_CONFIGURED",
      error: "Uploads are not available yet. Please send the screenshot on WhatsApp.",
    };
  }
  const key = `payment-proofs/${bookingId}/${crypto.randomBytes(16).toString("hex")}.${type}`;
  await storage.put(key, data, contentTypeFor(type));
  return { ok: true as const, key };
}

/** Customer (or guest) sends a screenshot from the app. */
export async function submitAppProof(params: {
  bookingId: string;
  userId: string | null;
  file: FormDataEntryValue | null;
  amount: unknown;
  transferReference?: unknown;
  transferredAt?: unknown;
}): Promise<{ ok: true; proof: MobileProof } | ProofError> {
  const amount = parseAmount(params.amount);
  if (amount === null) {
    return { ok: false, status: 400, code: "VALIDATION_ERROR", error: "Please enter the amount you transferred." };
  }
  const reference =
    typeof params.transferReference === "string" ? params.transferReference.trim().slice(0, 100) || null : null;
  let transferredAt: Date | null = null;
  if (typeof params.transferredAt === "string" && params.transferredAt.trim()) {
    transferredAt = new Date(params.transferredAt);
    if (Number.isNaN(transferredAt.getTime())) {
      return { ok: false, status: 400, code: "VALIDATION_ERROR", error: "transferredAt must be an ISO date-time." };
    }
  }

  await connectDB();
  const booking = await Booking.findById(params.bookingId).select("status").lean();
  if (!booking) return { ok: false, status: 404, code: "BOOKING_NOT_FOUND", error: "Booking not found" };
  if (booking.status === "cancelled") {
    return { ok: false, status: 409, code: "BOOKING_CANCELLED", error: "This booking is cancelled." };
  }
  const count = await PaymentProof.countDocuments({ bookingId: params.bookingId });
  if (count >= MAX_PROOFS_PER_BOOKING) {
    return {
      ok: false,
      status: 409,
      code: "TOO_MANY_PROOFS",
      error: "Too many screenshots for this booking. Please contact us on WhatsApp.",
    };
  }

  const file = await readProofFile(params.file);
  if (!file.ok) return file;
  const saved = await saveFile(params.bookingId, file.data, file.type);
  if (!saved.ok) return saved;

  const proof = await PaymentProof.create({
    bookingId: params.bookingId,
    userId: params.userId,
    source: "app",
    amount,
    transferReference: reference,
    transferredAt,
    status: "submitted",
    fileKey: saved.key,
    fileType: file.type,
    fileSize: file.data.length,
  });
  return { ok: true, proof: toMobileProof(proof.toObject() as unknown as ProofLike) };
}

/**
 * Add verified money to a booking and confirm it once the advance is covered.
 * Each step is a single database update, so two staff clicking at once can't
 * double count.
 */
async function applyVerifiedAmount(
  bookingId: mongoose.Types.ObjectId,
  amount: number,
  minAdvancePercent: number,
  refKey: string,
) {
  const updated = await Booking.findByIdAndUpdate(
    bookingId,
    { $inc: { amountReceivedOnline: amount, amountPaid: amount } },
    { new: true },
  ).lean();
  if (!updated) return null;
  // Money that arrives after the customer cancelled goes straight to their wallet.
  if (updated.status === "cancelled") {
    if (updated.userId) {
      await creditWallet({
        userId: updated.userId,
        amount,
        reason: "late_payment_refund",
        refKey,
        bookingId,
        note: "Payment verified after the booking was cancelled",
      });
      await Booking.updateOne({ _id: bookingId }, { $inc: { refundAmount: amount }, $set: { refundTo: "wallet" } });
    }
    return updated;
  }
  const advance = advanceFor(updated, minAdvancePercent);
  const covered = (updated.amountReceivedOnline ?? 0) + (updated.walletCreditUsed ?? 0);
  if (updated.status === "pending_payment" && covered >= advance) {
    await Booking.updateOne({ _id: bookingId, status: "pending_payment" }, { $set: { status: "confirmed" } });
  }
  return updated;
}

/** Staff: the screenshot is right. `amount` = what actually arrived. */
export async function verifyProof(params: {
  proofId: string;
  amount: unknown;
  staffId: string;
  minAdvancePercent: number;
}): Promise<{ ok: true } | ProofError> {
  const amount = parseAmount(params.amount);
  if (amount === null) {
    return { ok: false, status: 400, code: "VALIDATION_ERROR", error: "Enter the amount that arrived (whole PKR)." };
  }
  if (!mongoose.isValidObjectId(params.proofId)) {
    return { ok: false, status: 404, code: "PROOF_NOT_FOUND", error: "Payment proof not found" };
  }
  await connectDB();
  const proof = await PaymentProof.findOneAndUpdate(
    { _id: params.proofId, status: "submitted" },
    {
      $set: {
        status: "verified",
        verifiedAmount: amount,
        reviewedBy: params.staffId,
        reviewedAt: new Date(),
        rejectionReason: null,
      },
    },
    { new: true },
  );
  if (!proof) {
    return { ok: false, status: 409, code: "PROOF_ALREADY_REVIEWED", error: "This proof was already checked." };
  }
  await applyVerifiedAmount(proof.bookingId, amount, params.minAdvancePercent, `proof:${proof._id}`);
  return { ok: true };
}

/** Staff: the screenshot is wrong. The customer can send a new one. */
export async function rejectProof(params: {
  proofId: string;
  reason: unknown;
  staffId: string;
}): Promise<{ ok: true } | ProofError> {
  const reason = typeof params.reason === "string" ? params.reason.trim() : "";
  if (reason.length < 3 || reason.length > 300) {
    return { ok: false, status: 400, code: "VALIDATION_ERROR", error: "Please give a reason (3–300 characters)." };
  }
  if (!mongoose.isValidObjectId(params.proofId)) {
    return { ok: false, status: 404, code: "PROOF_NOT_FOUND", error: "Payment proof not found" };
  }
  await connectDB();
  const proof = await PaymentProof.findOneAndUpdate(
    { _id: params.proofId, status: "submitted" },
    { $set: { status: "rejected", rejectionReason: reason, reviewedBy: params.staffId, reviewedAt: new Date() } },
    { new: true },
  );
  if (!proof) {
    return { ok: false, status: 409, code: "PROOF_ALREADY_REVIEWED", error: "This proof was already checked." };
  }
  return { ok: true };
}

/** "IBX-2109", "ibx 2109" or "2109" → 2109. */
export function parseBookingReference(raw: unknown): number | null {
  if (typeof raw !== "string") return null;
  const m = raw.trim().match(/^(?:ibx[-\s]?)?(\d{1,9})$/i);
  return m ? Number(m[1]) : null;
}

/** Staff: a customer sent the screenshot on WhatsApp. Saved as already verified. */
export async function addWhatsAppProof(params: {
  bookingReference: unknown;
  amount: unknown;
  file: FormDataEntryValue | null;
  note: unknown;
  staffId: string;
  minAdvancePercent: number;
}): Promise<{ ok: true; bookingId: string } | ProofError> {
  const serial = parseBookingReference(params.bookingReference);
  if (serial === null) {
    return { ok: false, status: 400, code: "VALIDATION_ERROR", error: "Enter the booking reference, e.g. IBX-2109." };
  }
  const amount = parseAmount(params.amount);
  if (amount === null) {
    return { ok: false, status: 400, code: "VALIDATION_ERROR", error: "Enter the amount that arrived (whole PKR)." };
  }
  await connectDB();
  const booking = await Booking.findOne({ serialNumber: serial }).select("status").lean();
  if (!booking) return { ok: false, status: 404, code: "BOOKING_NOT_FOUND", error: `No booking IBX-${serial}.` };
  if (booking.status === "cancelled") {
    return { ok: false, status: 409, code: "BOOKING_CANCELLED", error: "This booking is cancelled." };
  }
  const bookingId = booking._id.toString();

  let fileFields: { fileKey: string; fileType: ProofFileType; fileSize: number } | null = null;
  const hasFile = params.file && typeof params.file !== "string" && params.file.size > 0;
  if (hasFile) {
    const file = await readProofFile(params.file);
    if (!file.ok) return file;
    const saved = await saveFile(bookingId, file.data, file.type);
    if (!saved.ok) return saved;
    fileFields = { fileKey: saved.key, fileType: file.type, fileSize: file.data.length };
  }

  const note = typeof params.note === "string" ? params.note.trim().slice(0, 300) || null : null;
  const created = await PaymentProof.create({
    bookingId,
    userId: null,
    source: "whatsapp",
    amount,
    status: "verified",
    verifiedAmount: amount,
    reviewedBy: params.staffId,
    reviewedAt: new Date(),
    note,
    ...(fileFields ?? {}),
  });
  await applyVerifiedAmount(
    booking._id as mongoose.Types.ObjectId,
    amount,
    params.minAdvancePercent,
    `proof:${created._id}`,
  );
  return { ok: true, bookingId };
}
