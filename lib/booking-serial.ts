import connectDB from "@/lib/mongodb";
import Counter from "@/models/Counter";
import Booking from "@/models/Booking";

const COUNTER_ID = "bookingSerial";

/**
 * Next booking serial number (1, 2, 3 …). One atomic step in the database,
 * so two bookings at the same moment can never get the same number.
 * The first time, the counter starts from the highest serial already used.
 */
export async function nextBookingSerial(): Promise<number> {
  await connectDB();
  const exists = await Counter.exists({ _id: COUNTER_ID });
  if (!exists) {
    const last = await Booking.findOne({ serialNumber: { $exists: true } })
      .sort({ serialNumber: -1 })
      .select("serialNumber")
      .lean();
    // $max: safe if two requests do this at once.
    await Counter.updateOne(
      { _id: COUNTER_ID },
      { $max: { seq: last?.serialNumber ?? 0 } },
      { upsert: true },
    );
  }
  const counter = await Counter.findOneAndUpdate(
    { _id: COUNTER_ID },
    { $inc: { seq: 1 } },
    { new: true, upsert: true },
  ).lean();
  return counter!.seq;
}
