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
 * Ordered 30-minute slot start times for admin create/edit booking grids.
 * Covers noon → end of overnight window (4 AM), then 4 AM → noon so bookings
 * that run past 4 AM (e.g. 3:30–5:00 AM) are visible and selectable.
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
