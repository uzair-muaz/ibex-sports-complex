/** Pure membership-hours maths, safe to use in the browser too. */

export type HoursReasonCode =
  | "NO_MEMBERSHIP"
  | "SPORT_NOT_INCLUDED"
  | "NO_HOURS_LEFT"
  | "WEEKDAYS_ONLY"
  | "TOO_SOON"
  | "EXPIRES_BEFORE_BOOKING";

export const HOURS_REASON_TEXT: Record<HoursReasonCode, string> = {
  NO_MEMBERSHIP: "You don't have an active membership.",
  SPORT_NOT_INCLUDED: "Your membership has no hours for this sport.",
  NO_HOURS_LEFT: "You have no hours left for this sport.",
  WEEKDAYS_ONLY: "Your membership can only be used on weekdays (Mon–Fri).",
  TOO_SOON: "Membership hours need to be booked further ahead for this day.",
  EXPIRES_BEFORE_BOOKING: "Your membership ends before this booking.",
};

/** Hours are used in half-hour steps. */
export function floorHalf(h: number): number {
  return Math.floor(Math.max(0, h) * 2 + 1e-9) / 2;
}

/**
 * How many hours to use and what they cover. Uses the hours the member has
 * (in half hours) and they pay the rest. The PKR covered is the same share of
 * the court fee as the share of the booking's length.
 */
export function hoursCover(params: {
  available: number;
  canUse: boolean;
  useHours: boolean;
  durationHours: number;
  courtFee: number;
}): { used: number; discount: number } {
  if (!params.useHours || !params.canUse || params.durationHours <= 0) return { used: 0, discount: 0 };
  const used = Math.min(floorHalf(params.available), params.durationHours);
  if (used <= 0) return { used: 0, discount: 0 };
  const discount =
    used >= params.durationHours ? params.courtFee : Math.round((params.courtFee * used) / params.durationHours);
  return { used, discount };
}

