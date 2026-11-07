import type { LoyaltyRules } from "@/lib/app-settings";

// Points rules come from Admin → App Settings (web and app use the same values).
// Browser-safe: no database imports here.

/** Most points a booking can take, or 0 if below the minimum. */
export function maxUsablePoints(balance: number, feeAfterPromo: number, rules: LoyaltyRules): number {
  const safeBalance = Math.max(0, Math.floor(balance));
  const maxByFee = Math.floor((Math.max(0, feeAfterPromo) * (rules.maxRedeemPercent / 100)) / rules.pkrPerPoint);
  const max = Math.min(safeBalance, maxByFee);
  return max > 0 && max >= rules.minRedeemPoints ? max : 0;
}

/** PKR discount for some points (never more than the fee). */
export function pointsDiscountPkr(points: number, feeAfterPromo: number, rules: LoyaltyRules): number {
  return Math.min(Math.max(0, feeAfterPromo), Math.floor(points * rules.pkrPerPoint));
}

/**
 * Points a booking earns once played. `paidTotal` = what the customer pays
 * (after promotions and points). Membership hours earn nothing unless the
 * admin turns that on.
 */
export function pointsEarnedFor(
  rules: LoyaltyRules,
  b: {
    /** Money paid (after hours, points and promotions). */
    paidTotal: number;
    durationMinutes: number;
    /** Minutes paid with membership hours. */
    membershipMinutes?: number;
    /** PKR the membership hours covered. */
    membershipValuePkr?: number;
  },
): number {
  if (rules.earnPoints <= 0) return 0;
  const hourMinutes = Math.min(b.durationMinutes, Math.max(0, b.membershipMinutes ?? 0));
  if (rules.earnBasis === "per_hour") {
    const minutes = rules.earnOnMembershipHours ? b.durationMinutes : b.durationMinutes - hourMinutes;
    return Math.round((minutes / 60) * rules.earnPoints);
  }
  const pkr = Math.max(0, b.paidTotal) + (rules.earnOnMembershipHours ? Math.max(0, b.membershipValuePkr ?? 0) : 0);
  return Math.floor(pkr / rules.earnPerPkr) * rules.earnPoints;
}
