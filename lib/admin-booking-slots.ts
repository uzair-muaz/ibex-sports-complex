import { formatTime12 } from "@/lib/utils";

/** End time label for a booking block (matches public booking copy). */
export function formatAdminBookingEndLabel(
  startTime: number,
  durationHours: number,
): string {
  const endAbs = startTime + durationHours;
  const dayInc = endAbs > 24;
  const endMod = ((endAbs % 24) + 24) % 24;
  return `${formatTime12(endMod)}${dayInc ? " (Next Day)" : ""}`;
}

/**
 * All 48 half-hour start times (bookings are taken all day, every day),
 * listed from noon so evening and overnight times come first.
 */
export function getAdminBookingTimeSlotStarts(): number[] {
  const slots: number[] = [];
  for (let hour = 12; hour < 24; hour++) {
    slots.push(hour, hour + 0.5);
  }
  for (let hour = 0; hour < 4; hour++) {
    slots.push(hour, hour + 0.5);
  }
  for (let hour = 4; hour < 12; hour++) {
    slots.push(hour, hour + 0.5);
  }
  return slots;
}
