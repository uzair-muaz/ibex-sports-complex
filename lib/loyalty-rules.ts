/** Locked loyalty rules — tweak here, not in call sites. */

export const LOYALTY_POINTS_PER_HOUR = 10;
export const LOYALTY_REDEEM_POINTS_PER_PKR = 1; // 100 pts = PKR 100 ⇒ 1 pt = PKR 1
export const LOYALTY_MIN_REDEEM_POINTS = 100;
/** Max redeemable share of post-promo totalPrice */
export const LOYALTY_MAX_REDEEM_FRACTION = 0.5;

export function pointsForDuration(durationHours: number): number {
  return Math.round(durationHours * LOYALTY_POINTS_PER_HOUR);
}

export function pkrFromPoints(points: number): number {
  return points * LOYALTY_REDEEM_POINTS_PER_PKR;
}

export function pointsFromPkr(pkr: number): number {
  return Math.floor(pkr / LOYALTY_REDEEM_POINTS_PER_PKR);
}

/** Max points a user may redeem on a booking after promo discounts. */
export function maxRedeemablePoints(
  balance: number,
  totalPriceAfterPromo: number,
): number {
  const maxByPrice = pointsFromPkr(
    Math.floor(totalPriceAfterPromo * LOYALTY_MAX_REDEEM_FRACTION),
  );
  const capped = Math.min(balance, maxByPrice);
  if (capped < LOYALTY_MIN_REDEEM_POINTS) return 0;
  // Redeem in whole PKR amounts; keep multiple of min only as floor check
  return capped;
}
