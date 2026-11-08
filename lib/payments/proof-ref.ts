import PaymentProof from "@/models/PaymentProof";
import { bookingReference } from "@/lib/api/booking-view";

/** For the audit log: which booking a payment proof belongs to. */
export async function proofRef(proofId: string): Promise<{ label: string; bookingId: string | null; customerId: string | null }> {
  try {
    const p = await PaymentProof.findById(proofId).populate("bookingId", "serialNumber userId").lean();
    const b = p?.bookingId as unknown as { _id: { toString(): string }; serialNumber?: number; userId?: unknown } | null;
    if (!b) return { label: "a booking", bookingId: null, customerId: null };
    return { label: bookingReference(b as never), bookingId: b._id.toString(), customerId: b.userId ? String(b.userId) : null };
  } catch {
    return { label: "a booking", bookingId: null, customerId: null };
  }
}
