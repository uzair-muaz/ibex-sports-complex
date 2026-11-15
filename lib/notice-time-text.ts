/** Plain-words text for the "customers can cancel until" setting in App Settings. */

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

/** 300 → "5 hours", 90 → "1 hour 30 minutes", 1500 → "1 day 1 hour". */
export function minutesInWords(total: number): string {
  const m = Math.max(0, Math.round(total));
  if (m === 0) return "0 minutes";
  const days = Math.floor(m / 1440);
  const hours = Math.floor((m % 1440) / 60);
  const mins = m % 60;
  const parts: string[] = [];
  if (days) parts.push(plural(days, "day"));
  if (hours) parts.push(plural(hours, "hour"));
  if (mins) parts.push(plural(mins, "minute"));
  return parts.join(" ");
}

function clock(minuteOfDay: number): string {
  const h24 = Math.floor(minuteOfDay / 60);
  const mm = String(minuteOfDay % 60).padStart(2, "0");
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${mm} ${h24 < 12 ? "AM" : "PM"}`;
}

/** When a booking starting at 8:00 PM can last be cancelled, e.g. "3:00 PM the same day". */
export function exampleCancelDeadline(noticeMinutes: number, startMinuteOfDay = 20 * 60): string {
  const at = startMinuteOfDay - Math.max(0, Math.round(noticeMinutes));
  const daysBack = Math.ceil(Math.max(0, -at) / 1440);
  const time = clock(((at % 1440) + 1440) % 1440);
  if (daysBack === 0) return `${time} the same day`;
  if (daysBack === 1) return `${time} the day before`;
  return `${time}, ${daysBack} days before`;
}
