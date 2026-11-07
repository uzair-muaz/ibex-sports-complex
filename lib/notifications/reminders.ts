import connectDB from "@/lib/mongodb";
import Booking from "@/models/Booking";
import { bookingStartMs } from "@/lib/api/booking-view";
import { pakistanNow } from "@/lib/booking-overlap";
import { shiftDateKey } from "@/lib/date-time";
import { notifyBookingReminder } from "@/lib/notifications/events";

export const REMINDER_HOURS_BEFORE = 2;

/**
 * Should this booking get its reminder now? Pure.
 * Yes when it starts within the next 2 hours, hasn't started, and wasn't
 * booked inside those 2 hours (people who book last-minute already know).
 */
export function dueForReminder(
  b: { date: string; startTime: number; createdAt?: Date | string | null },
  now: number,
): boolean {
  const startMs = bookingStartMs(b.date, b.startTime);
  const windowStart = startMs - REMINDER_HOURS_BEFORE * 3_600_000;
  if (now < windowStart || now >= startMs) return false;
  const created = b.createdAt ? new Date(b.createdAt).getTime() : 0;
  return created < windowStart;
}

/**
 * The scheduled job: send 2-hour reminders. Run every 10–15 minutes.
 * It ONLY sends reminders: it never cancels and never completes bookings
 * (staff mark bookings completed by hand).
 */
export async function runReminders(now = Date.now()): Promise<{ checked: number; sent: number }> {
  await connectDB();
  const today = pakistanNow(new Date(now)).dateKey;
  const candidates = await Booking.find({
    status: { $in: ["confirmed", "pending_payment"] },
    reminderSentAt: { $exists: false },
    date: { $in: [today, shiftDateKey(today, 1)] },
  })
    .select("date startTime createdAt")
    .lean();

  let sent = 0;
  for (const b of candidates) {
    if (!dueForReminder(b, now)) continue;
    // One database step decides who sends it, so two job runs can't both send.
    const claimed = await Booking.findOneAndUpdate(
      { _id: b._id, reminderSentAt: { $exists: false }, status: { $in: ["confirmed", "pending_payment"] } },
      { $set: { reminderSentAt: new Date(now) } },
    );
    if (!claimed) continue;
    await notifyBookingReminder(b._id);
    sent++;
  }
  return { checked: candidates.length, sent };
}
