import { slotStartIso } from "@/lib/api/availability";
import { toPkIso } from "@/lib/api/time";
import { dayIndex } from "@/lib/booking-overlap";
import type { MobileProof } from "@/lib/payments/proofs";

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
  usedMembershipHours?: boolean;
  membershipDiscountPkr?: number;
  totalPrice: number;
  amountPaid?: number;
  amountReceivedOnline?: number;
  advanceRequired?: number | null;
  walletCreditUsed?: number | null;
  refundAmount?: number | null;
  refundTo?: "wallet" | null;
  promoCode?: string | null;
  promoDiscountPkr?: number | null;
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
  /** courtFee − promoDiscount − hoursDiscount − pointsDiscount = total. promoCode is null when none was used. */
  price: {
    courtFee: number;
    promoCode: string | null;
    promoDiscount: number;
    hoursDiscount: number;
    pointsUsed: number;
    pointsDiscount: number;
    total: number;
  };
  payment: {
    status: MobilePaymentStatus;
    advanceRequired: number;
    amountVerified: number;
    walletCreditUsed: number;
    balanceDue: number;
    proofs: MobileProof[];
  };
  cancellation: { canCancel: boolean; cancelUntil: string | null };
  refund: { amount: number; to: "wallet" } | null;
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

/**
 * paid → everything paid; proof_submitted → a screenshot is waiting for staff;
 * verified → staff confirmed money (rest at the venue); rejected → the latest
 * screenshot was rejected; awaiting_proof → nothing sent yet.
 */
export function mobilePaymentStatus(p: {
  status: BookingSource["status"];
  total: number;
  paid: number;
  amountVerified: number;
  proofs: Pick<MobileProof, "status">[];
}): MobilePaymentStatus {
  if (p.total > 0 && p.paid >= p.total) return "paid";
  if (p.proofs.some((x) => x.status === "submitted")) return "proof_submitted";
  if (p.amountVerified > 0 || p.status === "confirmed" || p.status === "completed") return "verified";
  if (p.proofs.length > 0 && p.proofs[p.proofs.length - 1].status === "rejected") return "rejected";
  return "awaiting_proof";
}

export function toMobileBooking(
  b: BookingSource,
  ctx: {
    court?: { name: string; type: string } | null;
    cancellationNoticeMinutes: number;
    minAdvancePercent: number;
    now?: number;
    /** This booking's payment proofs, oldest first. */
    proofs?: MobileProof[];
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
  // Older bookings paid fully with hours didn't save the PKR covered.
  const hoursDiscount = !b.usedMembershipHours
    ? 0
    : b.membershipDiscountPkr
      ? Math.round(b.membershipDiscountPkr)
      : Math.max(0, courtFee - pointsDiscount - total);
  const walletCreditUsed = Math.round(b.walletCreditUsed ?? 0);
  const amountVerified = Math.round(b.amountReceivedOnline ?? 0);
  const amountPaid = Math.round(b.amountPaid ?? 0);
  const advanceRequired =
    typeof b.advanceRequired === "number"
      ? b.advanceRequired
      : Math.ceil((total * ctx.minAdvancePercent) / 100);

  const proofs = ctx.proofs ?? [];
  const paymentStatus = mobilePaymentStatus({
    status: b.status,
    total,
    paid: amountPaid + walletCreditUsed,
    amountVerified,
    proofs,
  });

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
    price: {
      courtFee,
      promoCode: b.promoCode ?? null,
      promoDiscount: Math.round(b.promoDiscountPkr ?? 0),
      hoursDiscount,
      pointsUsed: b.loyaltyPointsRedeemed ?? 0,
      pointsDiscount,
      total,
    },
    payment: {
      status: paymentStatus,
      advanceRequired,
      amountVerified,
      walletCreditUsed,
      balanceDue: Math.max(0, total - amountPaid - walletCreditUsed),
      proofs,
    },
    cancellation: { canCancel, cancelUntil: toPkIso(cancelUntilMs) },
    refund:
      b.status === "cancelled" && (b.refundAmount ?? 0) > 0
        ? { amount: Math.round(b.refundAmount ?? 0), to: b.refundTo ?? "wallet" }
        : null,
    hoursUsed: b.usedMembershipHours ? (b.membershipHoursUsed ?? 0) : 0,
    createdAt: toPkIso(b.createdAt ?? null),
  };
}
