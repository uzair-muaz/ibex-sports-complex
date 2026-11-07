import type { LoyaltyRules } from "@/lib/app-settings";
import { maxUsablePoints, pointsDiscountPkr, pointsEarnedFor } from "@/lib/loyalty-rules";
import { hoursCover, type HoursReasonCode } from "@/lib/membership-hours-rules";
import type { HoursCheck } from "@/lib/membership-hours";

/**
 * The one price calculation for the mobile app (quote now, booking in Phase 5).
 * Order: court fee (after automatic discounts) → membership hours → points →
 * total → advance → wallet → toTransfer → pointsToEarn. All money is whole PKR.
 */
export type QuoteInput = {
  /** Before automatic discounts, whole PKR. */
  originalCourtFee: number;
  /** After automatic discounts, whole PKR. */
  courtFee: number;
  durationMinutes: number;
  /** null for guests. */
  customer: { pointsBalance: number; walletBalance: number } | null;
  /** Membership hours for this slot's sport (signed-in customers only). */
  hours?: HoursCheck | null;
  useHours?: boolean;
  usePoints: boolean;
  useWallet: boolean;
  loyalty: LoyaltyRules;
  minAdvancePercent: number;
};

export type Quote = {
  originalCourtFee: number;
  promotionDiscount: number;
  courtFee: number;
  hours: {
    /** Hours left for this sport. */
    available: number;
    canUse: boolean;
    /** Why they can't be used, when canUse is false. */
    reasonCode: HoursReasonCode | null;
    used: number;
    discount: number;
  } | null;
  points: {
    available: number;
    canUse: boolean;
    minToUse: number;
    /** Most points this booking could take. */
    maxUsable: number;
    used: number;
    discount: number;
  } | null;
  wallet: { available: number; used: number } | null;
  total: number;
  advancePercent: number;
  advanceRequired: number;
  toTransfer: number;
  /** What is left to pay after the advance and wallet (at the venue or by later transfer). */
  remainingAfterAdvance: number;
  pointsToEarn: number;
};

/** Points this booking would earn, on the amount actually paid (total). */
export function pointsToEarn(
  loyalty: LoyaltyRules,
  total: number,
  durationMinutes: number,
  membership?: { minutes: number; valuePkr: number },
): number {
  return pointsEarnedFor(loyalty, {
    paidTotal: total,
    durationMinutes,
    membershipMinutes: membership?.minutes ?? 0,
    membershipValuePkr: membership?.valuePkr ?? 0,
  });
}

export function computeQuote(input: QuoteInput): Quote {
  const { loyalty } = input;
  const courtFee = Math.max(0, Math.round(input.courtFee));
  const originalCourtFee = Math.max(courtFee, Math.round(input.originalCourtFee));

  let hours: Quote["hours"] = null;
  let hoursDiscount = 0;
  let hoursUsed = 0;
  if (input.customer && input.hours) {
    const cover = hoursCover({
      available: input.hours.available,
      canUse: input.hours.canUse,
      useHours: input.useHours === true,
      durationHours: input.durationMinutes / 60,
      courtFee,
    });
    hoursUsed = cover.used;
    hoursDiscount = cover.discount;
    hours = { ...input.hours, used: cover.used, discount: cover.discount };
  }
  const afterHours = courtFee - hoursDiscount;

  let points: Quote["points"] = null;
  let pointsDiscount = 0;
  if (input.customer) {
    const balance = Math.max(0, Math.floor(input.customer.pointsBalance));
    const maxUsable = maxUsablePoints(balance, afterHours, loyalty);
    const canUse = maxUsable > 0;
    const used = input.usePoints && canUse ? maxUsable : 0;
    pointsDiscount = pointsDiscountPkr(used, afterHours, loyalty);
    points = {
      available: balance,
      canUse,
      minToUse: loyalty.minRedeemPoints,
      maxUsable: canUse ? maxUsable : 0,
      used,
      discount: pointsDiscount,
    };
  }

  const total = afterHours - pointsDiscount;
  const advanceRequired = Math.ceil((total * input.minAdvancePercent) / 100);

  let wallet: Quote["wallet"] = null;
  let walletUsed = 0;
  if (input.customer) {
    const available = Math.max(0, Math.floor(input.customer.walletBalance));
    walletUsed = input.useWallet ? Math.min(available, total) : 0;
    wallet = { available, used: walletUsed };
  }

  const toTransfer = Math.max(0, advanceRequired - walletUsed);

  return {
    originalCourtFee,
    promotionDiscount: originalCourtFee - courtFee,
    courtFee,
    hours,
    points,
    wallet,
    total,
    advancePercent: input.minAdvancePercent,
    advanceRequired,
    toTransfer,
    remainingAfterAdvance: Math.max(0, total - walletUsed - toTransfer),
    pointsToEarn: pointsToEarn(loyalty, total, input.durationMinutes, {
      minutes: Math.round(hoursUsed * 60),
      valuePkr: hoursDiscount,
    }),
  };
}
