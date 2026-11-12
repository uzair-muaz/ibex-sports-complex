// What staff give back when they cancel a booking. Browser-safe: no database imports.

export const STAFF_REFUND_CHOICES = ["wallet", "paid_back", "none"] as const;
export type StaffRefundChoice = (typeof STAFF_REFUND_CHOICES)[number];

type Money = { amountPaid?: number | null; walletCreditUsed?: number | null; userId?: unknown };

/**
 * What goes back for each choice. Pure.
 * - wallet: money paid + wallet credit used → wallet.
 * - paid_back: staff gave the money back by cash or bank; wallet credit used still → wallet.
 * - none: keep everything (late cancel or no-show): no money, points or hours back.
 */
export function staffRefundPlan(b: Money, choice: StaffRefundChoice) {
  const paid = Math.max(0, Math.round(b.amountPaid ?? 0));
  const walletUsed = Math.max(0, Math.round(b.walletCreditUsed ?? 0));
  if (choice === "none") return { toWallet: 0, paidBack: 0, returnPointsAndHours: false };
  if (choice === "paid_back") return { toWallet: walletUsed, paidBack: paid, returnPointsAndHours: true };
  return { toWallet: paid + walletUsed, paidBack: 0, returnPointsAndHours: true };
}

/** Default when staff don't choose: wallet for customers with an account, cash/bank for guests. */
export function defaultRefundChoice(b: Money): StaffRefundChoice {
  return b.userId ? "wallet" : "paid_back";
}
