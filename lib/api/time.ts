/**
 * Venue time helpers for the mobile API.
 * Pakistan has a fixed +05:00 offset (no daylight saving), so we can format
 * without a timezone library.
 */
const PK_OFFSET_MINUTES = 5 * 60;

/** ISO 8601 date-time in Pakistan time, e.g. "2026-11-05T18:00:00+05:00". */
export function toPkIso(value: Date | string | number | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const shifted = new Date(date.getTime() + PK_OFFSET_MINUTES * 60_000);
  // toISOString is UTC; after shifting, its wall clock is Pakistan time.
  return `${shifted.toISOString().slice(0, 19)}+05:00`;
}
