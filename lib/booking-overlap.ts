/**
 * Pure helpers for "is this time free?" on one court.
 * Same rules as app/actions/bookings.ts (which can't export plain functions
 * because it is a "use server" file). Bookings store date "YYYY-MM-DD",
 * startTime in hours (18.5 = 6:30 PM) and duration in hours, and may run
 * past midnight into the next day.
 */
export type BookingSpan = { date: string; startTime: number; duration: number };

export function dayIndex(dateKey: string): number {
  const [y, m, d] = dateKey.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}

/** Does a candidate [start, start+duration) on `dateKey` overlap this booking? */
export function overlapsBooking(
  dateKey: string,
  startHour: number,
  durationHours: number,
  booking: BookingSpan,
): boolean {
  const offset = (dayIndex(booking.date) - dayIndex(dateKey)) * 24;
  const bStart = offset + Number(booking.startTime);
  const bEnd = bStart + Number(booking.duration);
  const cEnd = startHour + durationHours;
  return startHour < bEnd && bStart < cEnd;
}

/** All half-hour start times (0, 0.5 … 23.5) from `fromHour` that are free. */
export function freeStartTimes(
  dateKey: string,
  durationHours: number,
  bookings: BookingSpan[],
  fromHour = 0,
): number[] {
  const free: number[] = [];
  for (let i = 0; i < 48; i++) {
    const start = i * 0.5;
    if (start < fromHour) continue;
    if (!bookings.some((b) => overlapsBooking(dateKey, start, durationHours, b))) {
      free.push(start);
    }
  }
  return free;
}

/** Venue "now": today's date key and the next half-hour start in Pakistan time. */
export function pakistanNow(now: Date = new Date()) {
  const pk = new Date(now.getTime() + 5 * 60 * 60_000);
  const dateKey = pk.toISOString().slice(0, 10);
  const hours = pk.getUTCHours() + pk.getUTCMinutes() / 60 + pk.getUTCSeconds() / 3600;
  const nextStartHour = Math.ceil(hours * 2) / 2;
  return { dateKey, hours, nextStartHour };
}
