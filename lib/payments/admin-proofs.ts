import connectDB from "@/lib/mongodb";
import PaymentProof from "@/models/PaymentProof";
import Booking from "@/models/Booking";
import { toMobileProof, advanceFor, type MobileProof } from "@/lib/payments/proofs";
import { bookingReference } from "@/lib/api/booking-view";
import { slotStartIso } from "@/lib/api/availability";

export type AdminProofRow = MobileProof & {
  booking: {
    id: string;
    reference: string;
    customerName: string;
    customerPhone: string;
    courtName: string;
    start: string;
    status: string;
    total: number;
    advanceRequired: number;
    amountVerified: number;
  } | null;
  note: string | null;
};

/** Proofs for the staff screen. "submitted" = waiting to be checked, oldest first. */
export async function listProofsForStaff(params: {
  status: "submitted" | "verified" | "rejected";
  minAdvancePercent: number;
  limit?: number;
}): Promise<AdminProofRow[]> {
  await connectDB();
  const proofs = await PaymentProof.find({ status: params.status })
    .sort({ createdAt: params.status === "submitted" ? 1 : -1 })
    .limit(Math.min(200, params.limit ?? 100))
    .lean();
  const bookings = await Booking.find({ _id: { $in: proofs.map((p) => p.bookingId) } })
    .populate("courtId", "name")
    .lean();
  const byId = new Map(bookings.map((b) => [b._id.toString(), b]));

  return proofs.map((p) => {
    const b = byId.get(p.bookingId.toString());
    const court = b?.courtId as unknown as { name?: string } | undefined;
    return {
      ...toMobileProof(p as never),
      note: p.note ?? null,
      booking: b
        ? {
            id: b._id.toString(),
            reference: bookingReference(b),
            customerName: b.userName,
            customerPhone: b.userPhone,
            courtName: court?.name ?? "Court",
            start: slotStartIso(b.date, b.startTime),
            status: b.status,
            total: Math.round(b.totalPrice),
            advanceRequired: advanceFor(b, params.minAdvancePercent),
            amountVerified: Math.round(b.amountReceivedOnline ?? 0),
          }
        : null,
    };
  });
}
