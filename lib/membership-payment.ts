// Browser-safe: no database imports (the admin screen uses the labels).
export const MEMBERSHIP_PAYMENT_METHODS = ["cash", "bank_transfer", "card", "free", "other"] as const;
export type MembershipPaymentMethod = (typeof MEMBERSHIP_PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABELS: Record<MembershipPaymentMethod, string> = {
  cash: "Cash",
  bank_transfer: "Bank transfer",
  card: "Card",
  free: "Free (no payment)",
  other: "Other",
};

/**
 * What the customer paid for a plan. Missing = not recorded (null);
 * a bad value = "invalid". "free" is always PKR 0.
 */
export function cleanMembershipPayment(
  v: unknown,
): { pricePaid: number; method: MembershipPaymentMethod; note?: string } | null | "invalid" {
  if (v === undefined || v === null) return null;
  if (typeof v !== "object") return "invalid";
  const p = v as Record<string, unknown>;
  const method = p.method as MembershipPaymentMethod;
  if (!MEMBERSHIP_PAYMENT_METHODS.includes(method)) return "invalid";
  const pricePaid = method === "free" ? 0 : p.pricePaid;
  if (typeof pricePaid !== "number" || !Number.isInteger(pricePaid) || pricePaid < 0 || pricePaid > 10_000_000) return "invalid";
  if (method !== "free" && pricePaid === 0) return "invalid";
  const note = typeof p.note === "string" ? p.note.trim().slice(0, 300) : "";
  return { pricePaid, method, ...(note ? { note } : {}) };
}
