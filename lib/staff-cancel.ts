/**
 * Staff cancel a booking from admin. One place for the Cancel button and for
 * changing the status to "cancelled" on the edit page, so both give back the
 * same things. Server-only (NOT "use server").
 */
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Booking from "@/models/Booking";
import { creditWallet } from "@/lib/wallet";
import { refundLoyaltyForBooking } from "@/lib/loyalty";
import { returnHoursForBooking } from "@/lib/membership-hours";
import { notifyBookingCancelled } from "@/lib/notifications/events";
import { releasePromoForBooking } from "@/lib/promo";

import { STAFF_REFUND_CHOICES, defaultRefundChoice, staffRefundPlan, type StaffRefundChoice } from "@/lib/staff-refund-plan";

export { STAFF_REFUND_CHOICES, defaultRefundChoice, staffRefundPlan, type StaffRefundChoice };

export type StaffCancelResult =
  | { ok: true; alreadyCancelled: boolean; toWallet: number; paidBack: number; choice: StaffRefundChoice | null }
  | { ok: false; status: number; code: string; error: string };

export async function staffCancelBooking(params: {
  bookingId: string;
  staffId: string;
  refund?: unknown;
  note?: unknown;
}): Promise<StaffCancelResult> {
  const bad = (error: string, code = "VALIDATION_ERROR", status = 400) => ({ ok: false as const, status, code, error });
  if (!mongoose.isValidObjectId(params.bookingId)) return bad("Booking not found", "BOOKING_NOT_FOUND", 404);
  if (params.refund !== undefined && params.refund !== null && !STAFF_REFUND_CHOICES.includes(params.refund as StaffRefundChoice)) {
    return bad("Choose what to give back: wallet, paid_back or none.");
  }
  if (params.note !== undefined && params.note !== null && typeof params.note !== "string") return bad("The note must be text.");
  const note = typeof params.note === "string" ? params.note.trim().slice(0, 300) : "";

  await connectDB();
  const booking = await Booking.findById(params.bookingId)
    .select("status date amountPaid walletCreditUsed userId")
    .lean();
  if (!booking) return bad("Booking not found", "BOOKING_NOT_FOUND", 404);
  if (booking.status === "cancelled") return { ok: true, alreadyCancelled: true, toWallet: 0, paidBack: 0, choice: null };
  if (booking.status === "completed") return bad("Completed bookings can't be cancelled.", "NOT_CANCELLABLE", 409);

  const choice = (params.refund as StaffRefundChoice | undefined) ?? defaultRefundChoice(booking);
  if (choice === "wallet" && !booking.userId) {
    return bad("This is a guest booking with no account, so there's no wallet. Choose cash/bank or keep the money.", "NO_WALLET", 409);
  }
  if (choice === "none" && note.length < 3) {
    return bad("Please write why the money is kept (for example: no-show).");
  }
  const plan = staffRefundPlan(booking, choice);

  // The one step that decides: only an active booking turns into cancelled, so a double click can't refund twice.
  const flipped = await Booking.findOneAndUpdate(
    { _id: params.bookingId, status: { $in: ["pending_payment", "confirmed"] } },
    {
      $set: {
        status: "cancelled",
        cancelledAt: new Date(),
        cancelledBy: "staff",
        cancelledByUserId: params.staffId,
        cancelNote: note || null,
        refundChoice: choice,
        refundAmount: plan.toWallet,
        refundPaidBackPkr: plan.paidBack,
        ...(plan.toWallet > 0 ? { refundTo: "wallet" } : {}),
      },
    },
    { new: true },
  ).lean();
  if (!flipped) return { ok: true, alreadyCancelled: true, toWallet: 0, paidBack: 0, choice: null };

  if (plan.toWallet > 0 && booking.userId) {
    // Same key as a customer cancel, so a booking can only ever be refunded once.
    await creditWallet({
      userId: booking.userId,
      amount: plan.toWallet,
      reason: "booking_refund",
      refKey: `cancel:${params.bookingId}`,
      bookingId: params.bookingId,
      note: note ? `Cancelled by the venue: ${note}` : "Cancelled by the venue",
      createdBy: params.staffId,
    });
  }
  if (plan.returnPointsAndHours) {
    await refundLoyaltyForBooking(params.bookingId);
    await returnHoursForBooking(params.bookingId);
    // The promo code can be used again (not when staff keep the money).
    await releasePromoForBooking(params.bookingId);
  }
  await notifyBookingCancelled({ bookingId: params.bookingId, by: "venue", refundAmount: plan.toWallet });

  void import("@/lib/analytics/daily-rollup")
    .then(({ rebuildAnalyticsDaily }) => rebuildAnalyticsDaily([booking.date]))
    .catch((err) => console.error("Analytics daily rebuild failed:", err));

  return { ok: true, alreadyCancelled: false, toWallet: plan.toWallet, paidBack: plan.paidBack, choice };
}
