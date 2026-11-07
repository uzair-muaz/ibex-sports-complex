import { slotStartIso } from "@/lib/api/availability";
import { toPkIso } from "@/lib/api/time";
import { dayIndex } from "@/lib/booking-overlap";

/** Fields we read from a Booking row. */
export type BookingSource = {
  _id: { toString(): string };
  serialNumber?: number | null;
  courtId: { toString(): string } | { _id: { toString(): string }; name?: string; type?: string };
  date: string;
  startTime: number;
  duration: number;
  status: "pending_payment" | "confirmed" | "cancelled" | "completed";
  userId?: { toString(): string } | null;
  originalPrice: number;
  discountAmount?: number;
  loyaltyPointsRedeemed?: number;
  loyaltyDiscountPkr?: number;
  membershipHoursUsed?: number;
  totalPrice: number;
  amountPaid?: number;
  amountReceivedOnline?: number;
  advanceRequired?: number | null;
  walletCreditUsed?: number | null;
  createdAt?: Date | string;
};

export type MobileBookingStatus = "reserved" | "confirmed" | "completed" | "cancelled";
export type MobilePaymentStatus = "awaiting_proof" | "proof_submitted" | "verified" | "rejected" | "paid";

export type MobileBooking = {
  id: string;
  reference: string;
  courtId: string;
  courtName: string;
  sport: string;
  start: string;
  durationMinutes: number;
  status: MobileBookingStatus;
  price: { courtFee: number; pointsUsed: number; pointsDiscount: number; total: number };
  payment: {
    status: MobilePaymentStatus;
    advanceRequired: number;
    amountVerified: number;
    walletCreditUsed: number;
    balanceDue: number;
    proofs: unknown[];
  };
  cancellation: { canCancel: boolean; cancelUntil: string | null };
  refund: null;
  hoursUsed: number;
  createdAt: string | null;
};

/** "IBX-8821". Old bookings without a serial use the end of the id. */
export function bookingReference(b: Pick<BookingSource, "serialNumber" | "_id">): string {
  if (b.serialNumber) return `IBX-${b.serialNumber}`;
  return `IBX-${b._id.toString().slice(-6).toUpperCase()}`;
}

/** The database keeps "pending_payment"; the app shows "reserved". */
export function mobileStatus(status: BookingSource["status"]): MobileBookingStatus {
  return status === "pending_payment" ? "reserved" : status;
}

/** Milliseconds (UTC) when the booking starts. Venue time is UTC+5. */
export function bookingStartMs(date: string, startHour: number): number {
  return dayIndex(date) * 86_400_000 + startHour * 3_600_000 - 5 * 3_600_000;
}

export function toMobileBooking(
  b: BookingSource,
  ctx: {
    court?: { name: string; type: string } | null;
    cancellationNoticeMinutes: number;
    minAdvancePercent: number;
    now?: number;
  },
): MobileBooking {
  const now = ctx.now ?? Date.now();
  const populated = typeof b.courtId === "object" && b.courtId && "_id" in b.courtId ? b.courtId : null;
  const courtId = populated ? populated._id.toString() : b.courtId.toString();
  const courtName = ctx.court?.name ?? populated?.name ?? "Court";
  const sport = ctx.court?.type ?? populated?.type ?? "";

  const courtFee = Math.round((b.originalPrice ?? 0) - (b.discountAmount ?? 0));
  const pointsDiscount = Math.round(b.loyaltyDiscountPkr ?? 0);
  const total = Math.round(b.totalPrice ?? 0);
  const walletCreditUsed = Math.round(b.walletCreditUsed ?? 0);
  const amountVerified = Math.round(b.amountReceivedOnline ?? 0);
  const amountPaid = Math.round(b.amountPaid ?? 0);
  const advanceRequired =
    typeof b.advanceRequired === "number"
      ? b.advanceRequired
      : Math.ceil((total * ctx.minAdvancePercent) / 100);

  let paymentStatus: MobilePaymentStatus = "awaiting_proof";
  if (total > 0 && amountPaid + walletCreditUsed >= total) paymentStatus = "paid";
  else if (b.status === "confirmed" || b.status === "completed") paymentStatus = "verified";

  const startMs = bookingStartMs(b.date, b.startTime);
  const cancelUntilMs = startMs - ctx.cancellationNoticeMinutes * 60_000;
  const isGuest = !b.userId;
  const canCancel =
    !isGuest && (b.status === "pending_payment" || b.status === "confirmed") && now < cancelUntilMs;

  return {
    id: b._id.toString(),
    reference: bookingReference(b),
    courtId,
    courtName,
    sport,
    start: slotStartIso(b.date, b.startTime),
    durationMinutes: Math.round(b.duration * 60),
    // A confirmed booking whose time has passed shows as completed (PDF §9).
    status:
      b.status === "confirmed" && now >= startMs + b.duration * 3_600_000
        ? "completed"
        : mobileStatus(b.status),
    price: { courtFee, pointsUsed: b.loyaltyPointsRedeemed ?? 0, pointsDiscount, total },
    payment: {
      status: paymentStatus,
      advanceRequired,
      amountVerified,
      walletCreditUsed,
      balanceDue: Math.max(0, total - amountPaid - walletCreditUsed),
      proofs: [],
    },
    cancellation: { canCancel, cancelUntil: toPkIso(cancelUntilMs) },
    refund: null,
    hoursUsed: b.membershipHoursUsed ?? 0,
    createdAt: toPkIso(b.createdAt ?? null),
  };
}
