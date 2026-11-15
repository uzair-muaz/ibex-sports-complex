/**
 * "Record payment" on the bookings screen: staff add a payment the customer
 * made after booking (usually the rest, at the venue). Pure rules, no database.
 */

export type VenuePaymentMethod = "cash" | "bank";

type Money = {
  status: string;
  totalPrice: number;
  amountPaid?: number | null;
  walletCreditUsed?: number | null;
};

/** What the customer still owes (whole PKR, never below 0). */
export function stillToPay(b: Money): number {
  return Math.max(
    0,
    Math.round(b.totalPrice ?? 0) - Math.round(b.amountPaid ?? 0) - Math.round(b.walletCreditUsed ?? 0),
  );
}

export type VenuePaymentInput = { amount: number; method: VenuePaymentMethod; note: string | null };

/** Check what staff typed. Returns the clean values or a plain-words error. */
export function checkVenuePayment(
  b: Money,
  raw: { amount?: unknown; method?: unknown; note?: unknown },
): { ok: true; value: VenuePaymentInput } | { ok: false; error: string } {
  if (b.status === "cancelled") return { ok: false, error: "This booking is cancelled, so a payment can't be added." };
  const due = stillToPay(b);
  if (due === 0) return { ok: false, error: "This booking is already fully paid." };
  const n = typeof raw.amount === "string" ? Number(raw.amount) : raw.amount;
  if (typeof n !== "number" || !Number.isFinite(n) || n <= 0) {
    return { ok: false, error: "Enter the amount the customer paid (PKR)." };
  }
  const amount = Math.round(n);
  if (amount > due) {
    return { ok: false, error: `That is more than the PKR ${due.toLocaleString()} still to pay.` };
  }
  if (raw.method !== "cash" && raw.method !== "bank") {
    return { ok: false, error: "Choose how the customer paid: cash or bank transfer." };
  }
  const note = typeof raw.note === "string" ? raw.note.trim().slice(0, 200) || null : null;
  return { ok: true, value: { amount, method: raw.method, note } };
}
