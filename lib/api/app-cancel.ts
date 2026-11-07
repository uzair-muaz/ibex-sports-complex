import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Booking from "@/models/Booking";
import { getAppSettings } from "@/lib/app-settings";
import { refundLoyaltyForBooking } from "@/lib/loyalty";
import { returnHoursForBooking } from "@/lib/membership-hours";
import { creditWallet } from "@/lib/wallet";
import { toPkIso } from "@/lib/api/time";
import { bookingStartMs, type MobileBooking } from "@/lib/api/booking-view";
import { getAppBookingWhere } from "@/lib/api/my-bookings";

export const CANCEL_REASONS = ["weather", "teammate_unavailable", "schedule_conflict", "other"] as const;
export type CancelReason = (typeof CANCEL_REASONS)[number];

type CancelSource = {
  status: "pending_payment" | "confirmed" | "cancelled" | "completed";
  date: string;
  startTime: number;
  amountPaid?: number | null;
  walletCreditUsed?: number | null;
  loyaltyPointsRedeemed?: number | null;
  usedMembershipHours?: boolean | null;
  membershipHoursUsed?: number | null;
  membershipHoursReturnedAt?: Date | null;
  duration: number;
};

export type CancelPreview = {
  canCancel: boolean;
  cancelUntil: string | null;
  refundAmount: number;
  refundTo: "wallet" | null;
  pointsReturned: number;
  hoursReturned: number;
  /** Why not, when canCancel is false. */
  reasonCode: "ALREADY_CANCELLED" | "ALREADY_STARTED" | "CANCEL_WINDOW_PASSED" | "NOT_CANCELLABLE" | null;
};

/** What the customer gets back, and whether they can cancel now. Pure. */
export function cancellationPreview(
  b: CancelSource,
  cancellationNoticeMinutes: number,
  now = Date.now(),
): CancelPreview {
  const startMs = bookingStartMs(b.date, b.startTime);
  const cancelUntilMs = startMs - cancellationNoticeMinutes * 60_000;
  // Money paid (bank transfer verified + cash) and wallet credit used both go to the wallet.
  const refundAmount = Math.max(0, Math.round((b.amountPaid ?? 0) + (b.walletCreditUsed ?? 0)));
  const hoursReturned =
    b.usedMembershipHours && !b.membershipHoursReturnedAt ? (b.membershipHoursUsed || b.duration) : 0;

  let reasonCode: CancelPreview["reasonCode"] = null;
  if (b.status === "cancelled") reasonCode = "ALREADY_CANCELLED";
  else if (b.status !== "pending_payment" && b.status !== "confirmed") reasonCode = "NOT_CANCELLABLE";
  else if (now >= startMs) reasonCode = "ALREADY_STARTED";
  else if (now >= cancelUntilMs) reasonCode = "CANCEL_WINDOW_PASSED";

  return {
    canCancel: reasonCode === null,
    cancelUntil: toPkIso(cancelUntilMs),
    refundAmount,
    refundTo: refundAmount > 0 ? "wallet" : null,
    pointsReturned: b.loyaltyPointsRedeemed ?? 0,
    hoursReturned,
    reasonCode,
  };
}

const ERRORS: Record<NonNullable<CancelPreview["reasonCode"]>, { status: number; error: string }> = {
  ALREADY_CANCELLED: { status: 409, error: "This booking is already cancelled." },
  NOT_CANCELLABLE: { status: 409, error: "This booking can't be cancelled." },
  ALREADY_STARTED: { status: 422, error: "This booking has already started." },
  CANCEL_WINDOW_PASSED: {
    status: 422,
    error: "It's too late to cancel in the app. Please contact the venue.",
  },
};

const SELECT =
  "status date startTime duration amountPaid walletCreditUsed loyaltyPointsRedeemed usedMembershipHours membershipHoursUsed membershipHoursReturnedAt membershipId usedGuestPass userId";

export async function getCancellationPreview(userId: string, bookingId: string) {
  if (!mongoose.isValidObjectId(bookingId)) return null;
  await connectDB();
  const [booking, settings] = await Promise.all([
    Booking.findOne({ _id: bookingId, userId }).select(SELECT).lean(),
    getAppSettings(),
  ]);
  if (!booking) return null;
  const preview = cancellationPreview(booking, settings.cancellationNoticeMinutes);
  return {
    canCancel: preview.canCancel,
    cancelUntil: preview.cancelUntil,
    refundAmount: preview.refundAmount,
    refundTo: preview.refundTo,
    pointsReturned: preview.pointsReturned,
    hoursReturned: preview.hoursReturned,
  };
}

export type CancelResult =
  | { ok: true; booking: MobileBooking }
  | { ok: false; status: number; code: string; error: string };

/**
 * Cancel from the app. The status change is one database step that only
 * works on an active booking, so a double tap can never refund twice.
 */
export async function cancelAppBooking(params: {
  userId: string;
  bookingId: string;
  reason: unknown;
  note: unknown;
}): Promise<CancelResult> {
  const reason = params.reason as CancelReason;
  if (!CANCEL_REASONS.includes(reason)) {
    return {
      ok: false,
      status: 400,
      code: "VALIDATION_ERROR",
      error: `reason must be one of: ${CANCEL_REASONS.join(", ")}.`,
    };
  }
  if (params.note !== undefined && params.note !== null && typeof params.note !== "string") {
    return { ok: false, status: 400, code: "VALIDATION_ERROR", error: "note must be text." };
  }
  const note = typeof params.note === "string" ? params.note.trim().slice(0, 300) || null : null;
  const notFound = { ok: false as const, status: 404, code: "BOOKING_NOT_FOUND", error: "Booking not found" };
  if (!mongoose.isValidObjectId(params.bookingId)) return notFound;

  await connectDB();
  const [booking, settings] = await Promise.all([
    Booking.findOne({ _id: params.bookingId, userId: params.userId }).select(SELECT).lean(),
    getAppSettings(),
  ]);
  if (!booking) return notFound;

  const preview = cancellationPreview(booking, settings.cancellationNoticeMinutes);
  if (!preview.canCancel && preview.reasonCode) {
    const e = ERRORS[preview.reasonCode];
    return { ok: false, status: e.status, code: preview.reasonCode, error: e.error };
  }

  // The one step that decides: only an active booking turns into cancelled.
  const flipped = await Booking.findOneAndUpdate(
    { _id: params.bookingId, userId: params.userId, status: { $in: ["pending_payment", "confirmed"] } },
    {
      $set: {
        status: "cancelled",
        cancelledAt: new Date(),
        cancelledBy: "customer",
        cancelReason: reason,
        cancelNote: note,
        refundAmount: preview.refundAmount,
        ...(preview.refundTo ? { refundTo: preview.refundTo } : {}),
      },
    },
    { new: true },
  ).lean();
  if (!flipped) {
    return { ok: false, status: 409, code: "ALREADY_CANCELLED", error: ERRORS.ALREADY_CANCELLED.error };
  }

  // Give things back. Each of these is safe to run once per booking.
  if (preview.refundAmount > 0) {
    await creditWallet({
      userId: params.userId,
      amount: preview.refundAmount,
      reason: "booking_refund",
      refKey: `cancel:${params.bookingId}`,
      bookingId: params.bookingId,
      note: "Booking cancelled in the app",
    });
  }
  await refundLoyaltyForBooking(params.bookingId);
  await returnHoursForBooking(params.bookingId);

  void import("@/lib/analytics/daily-rollup")
    .then(({ rebuildAnalyticsDaily }) => rebuildAnalyticsDaily([booking.date]))
    .catch((err) => console.error("Analytics daily rebuild failed:", err));

  const view = await getAppBookingWhere(params.bookingId, { userId: params.userId });
  return { ok: true, booking: view! };
}
