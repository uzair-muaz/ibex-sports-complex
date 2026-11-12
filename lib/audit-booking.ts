/** Audit log for staff booking changes. Server-only. */
import Booking from "@/models/Booking";
import { audit, type AuditActor } from "@/lib/audit";
import { bookingReference } from "@/lib/api/booking-view";
import { diffChanges } from "@/lib/audit-rules";

const FIELDS =
  "serialNumber courtId date startTime duration status userId userName userEmail userPhone totalPrice amountPaid amountReceivedOnline amountReceivedCash refundChoice refundAmount refundPaidBackPkr cancelNote";

type Snap = Record<string, unknown> & { _id?: unknown; serialNumber?: number; userId?: unknown };

/** The fields staff can change, as plain data. */
export async function bookingSnap(bookingId: string): Promise<Snap | null> {
  try {
    const b = await Booking.findById(bookingId).select(FIELDS).populate("courtId", "name").lean();
    if (!b) return null;
    const plain = JSON.parse(JSON.stringify(b)) as Snap;
    plain.court = (b.courtId as unknown as { name?: string } | null)?.name ?? null;
    delete plain.courtId;
    return plain;
  } catch {
    return null;
  }
}

const ACTION_TEXT: Record<string, string> = { update: "Changed", cancel: "Cancelled", delete: "Deleted" };

export async function auditBooking(actor: AuditActor, bookingId: string, action: "update" | "cancel" | "delete", before: Snap | null, extra = "") {
  const after = action === "delete" ? null : await bookingSnap(bookingId);
  const base = after ?? before;
  if (!base) return;
  const ref = bookingReference({ _id: bookingId, serialNumber: base.serialNumber } as never);
  const changes = action === "delete" ? [] : diffChanges(before ?? {}, after ?? {});
  if (action === "update" && changes.length === 0) return;
  await audit({
    actor,
    area: "bookings",
    action,
    targetId: bookingId,
    targetLabel: ref,
    customerId: base.userId ? String(base.userId) : null,
    summary: `${ACTION_TEXT[action]} booking ${ref} (${String(base.userName ?? "")}, ${String(base.date ?? "")})${extra}`,
    changes,
  });
}
