export const BUSINESS_TIMEZONE = "Asia/Karachi";

export function toDateKeyInTimezone(date: Date, timeZone: string = BUSINESS_TIMEZONE): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function getBusinessDateKey(date: Date = new Date()): string {
  return toDateKeyInTimezone(date, BUSINESS_TIMEZONE);
}

// Parse YYYY-MM-DD as a timezone-neutral calendar date backed by UTC midnight.
export function parseDateKeyUTC(dateKey: string): Date {
  const [y, m, d] = dateKey.split("-").map((x) => Number(x));
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
}

export function formatDateKeyUTC(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function shiftDateKey(dateKey: string, days: number): string {
  const dt = parseDateKeyUTC(dateKey);
  dt.setUTCDate(dt.getUTCDate() + days);
  return formatDateKeyUTC(dt);
}

