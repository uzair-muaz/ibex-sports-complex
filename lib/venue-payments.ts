import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Booking from "@/models/Booking";
import { checkVenuePayment } from "@/lib/venue-payments-rules";

/**
 * Save one payment staff recorded for a booking. Adds a new entry to the
 * booking's payment history and adds the money to its totals. A reserved
 * booking becomes confirmed. Server-only.
 */
export async function recordVenuePayment(params: {
  bookingId: string;
  staffId: string;
  amount: unknown;
  method: unknown;
  note?: unknown;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!mongoose.isValidObjectId(params.bookingId)) return { ok: false, error: "Booking not found." };
  await connectDB();
  const b = await Booking.findById(params.bookingId)
    .select("status totalPrice amountPaid walletCreditUsed")
    .lean();
  if (!b) return { ok: false, error: "Booking not found." };

  const checked = checkVenuePayment(b, params);
  if (!checked.ok) return checked;
  const { amount, method, note } = checked.value;

  // Only save if nothing changed since we read it, so two staff can't record the same money twice.
  const saved = await Booking.updateOne(
    { _id: b._id, status: b.status, amountPaid: b.amountPaid ?? { $in: [null, 0] } },
    {
      $inc: { amountPaid: amount, [method === "cash" ? "amountReceivedCash" : "amountReceivedOnline"]: amount },
      $push: { venuePayments: { amount, method, note, receivedAt: new Date(), staffId: params.staffId } },
    },
  );
  if (saved.modifiedCount !== 1) {
    return { ok: false, error: "This booking just changed. Please close this box and try again." };
  }
  await Booking.updateOne({ _id: b._id, status: "pending_payment" }, { $set: { status: "confirmed" } });
  return { ok: true };
}
