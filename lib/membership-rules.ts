/** Fallback only, for a plan saved without "days until it expires". */
export const MEMBERSHIP_VALIDITY_DAYS = 30;
/*
 * Membership notice and carry-over days, the cancellation notice and plan
 * prices are all set by the super admin (App Settings and Memberships → Plans).
 * Nothing here is a price or a rule the venue sets.
 */

/** Local calendar day-of-week from YYYY-MM-DD (0=Sun … 6=Sat). */
export function dayOfWeekFromDateKey(dateKey: string): number {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, d).getDay();
}

export function isWeekendDateKey(dateKey: string): boolean {
  const dow = dayOfWeekFromDateKey(dateKey);
  return dow === 0 || dow === 6;
}

export function isWeekdayDateKey(dateKey: string): boolean {
  return !isWeekendDateKey(dateKey);
}

/** Hours until slot start from `now`. */
export function hoursUntilSlotStart(
  dateKey: string,
  startTime: number,
  now: Date = new Date(),
): number {
  const [y, m, d] = dateKey.split("-").map(Number);
  const hour = Math.floor(startTime);
  const minutes = Math.round((startTime - hour) * 60);
  const start = new Date(y, m - 1, d, hour, minutes, 0, 0);
  return (start.getTime() - now.getTime()) / (1000 * 60 * 60);
}

export function customerCanCancelBooking(params: {
  status: string;
  date: string;
  startTime: number;
  /** From App Settings (cancellationNoticeMinutes). */
  noticeMinutes: number;
  now?: Date;
}): boolean {
  if (params.status !== "pending_payment" && params.status !== "confirmed") {
    return false;
  }
  return (
    hoursUntilSlotStart(params.date, params.startTime, params.now) >=
    params.noticeMinutes / 60
  );
}

// Membership hours checks (sport, weekdays only, notice) live in lib/membership-hours.ts and use App Settings.
