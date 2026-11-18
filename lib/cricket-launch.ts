/** Box cricket launch: customers can book now, but only for 22 Nov 2026 and later. */
export const CRICKET_BOOKINGS_FROM = "2026-11-22";

export const CRICKET_TOO_EARLY_MESSAGE =
  "Cricket bookings start from 22 November 2026. Please pick 22 November or a later date.";

/** True when this is a cricket booking for a date before the first cricket day. */
export function isCricketDateTooEarly(courtType: string, date: string): boolean {
  return courtType === "CRICKET" && date < CRICKET_BOOKINGS_FROM;
}
