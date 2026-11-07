import type { LoyaltyRules } from "@/lib/app-settings";
import { maxUsablePoints, pointsDiscountPkr, pointsEarnedFor } from "@/lib/loyalty-rules";

/**
 * The one price calculation for the mobile app (quote now, booking in Phase 5).
 * Order: court fee (after automatic discounts) → points → total → advance →
 * wallet → toTransfer → pointsToEarn. All money is whole PKR.
 *
 * Membership hours (Phase 12) will slot in before points.
 */
export type QuoteInput = {
  /** Before automatic discounts, whole PKR. */
  originalCourtFee: number;
  /** After automatic discounts, whole PKR. */
  courtFee: number;
  durationMinutes: number;
  /** null for guests. */
  customer: { pointsBalance: number; walletBalance: number } | null;
  usePoints: boolean;
  useWallet: boolean;
  loyalty: LoyaltyRules;
  minAdvancePercent: number;
};

export type Quote = {
  originalCourtFee: number;
  promotionDiscount: number;
  courtFee: number;
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
export function pointsToEarn(loyalty: LoyaltyRules, total: number, durationMinutes: number): number {
  return pointsEarnedFor(loyalty, { paidTotal: total, durationMinutes });
}

export function computeQuote(input: QuoteInput): Quote {
  const { loyalty } = input;
  const courtFee = Math.max(0, Math.round(input.courtFee));
  const originalCourtFee = Math.max(courtFee, Math.round(input.originalCourtFee));

  let points: Quote["points"] = null;
  let pointsDiscount = 0;
  if (input.customer) {
    const balance = Math.max(0, Math.floor(input.customer.pointsBalance));
    const maxUsable = maxUsablePoints(balance, courtFee, loyalty);
    const canUse = maxUsable > 0;
    const used = input.usePoints && canUse ? maxUsable : 0;
    pointsDiscount = pointsDiscountPkr(used, courtFee, loyalty);
    points = {
      available: balance,
      canUse,
      minToUse: loyalty.minRedeemPoints,
      maxUsable: canUse ? maxUsable : 0,
      used,
      discount: pointsDiscount,
    };
  }

  const total = courtFee - pointsDiscount;
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
    points,
    wallet,
    total,
    advancePercent: input.minAdvancePercent,
    advanceRequired,
    toTransfer,
    remainingAfterAdvance: Math.max(0, total - walletUsed - toTransfer),
    pointsToEarn: pointsToEarn(loyalty, total, input.durationMinutes),
  };
}
