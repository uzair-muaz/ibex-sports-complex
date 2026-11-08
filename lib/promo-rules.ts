import { BUILT_IN_SPORTS, isSportCode, labelFromSportCode } from "@/lib/sport-rules";
/**
 * Promo codes customers type in. Pure rules, browser-safe (no database).
 * A code takes money off the court fee after automatic discounts, before
 * membership hours, points and wallet.
 */
/** The built-in sports (more can be added in App Settings; any sport code is accepted). */
export const PROMO_SPORTS = BUILT_IN_SPORTS;
export type PromoSport = string;

export type PromoRules = {
  code: string;
  description?: string;
  type: "percentage" | "fixed";
  /** Percent (1–100) or whole PKR. */
  value: number;
  /** Most PKR a percentage code can take off (optional). */
  maxDiscountPkr?: number | null;
  /** Court fee must be at least this (optional). */
  minFeePkr?: number | null;
  /** Empty = every sport. */
  sports: string[];
  validFrom?: Date | string | null;
  validUntil?: Date | string | null;
  /** Total uses allowed (optional). */
  maxUses?: number | null;
  /** Uses per customer (default 1). */
  maxUsesPerCustomer?: number | null;
  /** Only for customers with no earlier booking. */
  newCustomersOnly?: boolean;
  isActive: boolean;
  usedCount?: number;
};

export type PromoReason =
  | "PROMO_NOT_FOUND"
  | "PROMO_INACTIVE"
  | "PROMO_NOT_STARTED"
  | "PROMO_EXPIRED"
  | "PROMO_WRONG_SPORT"
  | "PROMO_MIN_FEE"
  | "PROMO_USED_UP"
  | "PROMO_ALREADY_USED"
  | "PROMO_NEW_CUSTOMERS_ONLY";

export const PROMO_REASON_TEXT: Record<PromoReason, string> = {
  PROMO_NOT_FOUND: "This promo code doesn't exist.",
  PROMO_INACTIVE: "This promo code is switched off.",
  PROMO_NOT_STARTED: "This promo code can't be used yet.",
  PROMO_EXPIRED: "This promo code has expired.",
  PROMO_WRONG_SPORT: "This promo code isn't for this sport.",
  PROMO_MIN_FEE: "The court fee is below this promo code's minimum.",
  PROMO_USED_UP: "This promo code has been fully used.",
  PROMO_ALREADY_USED: "You've already used this promo code.",
  PROMO_NEW_CUSTOMERS_ONLY: "This promo code is only for your first booking.",
};

/** Sport names; a sport added later gets a name made from its code ("TABLE_TENNIS" → "Table Tennis"). */
export const SPORT_NAMES: Record<string, string> = new Proxy(
  { PADEL: "Padel", PICKLEBALL: "Pickleball", FUTSAL: "Futsal", CRICKET: "Cricket" } as Record<string, string>,
  { get: (t, k) => (typeof k === "string" ? (t[k] ?? (isSportCode(k) ? labelFromSportCode(k) : undefined)) : undefined) },
);

/** "  eid-20 " → "EID-20". */
export function normaliseCode(v: unknown): string {
  return typeof v === "string" ? v.trim().toUpperCase().replace(/\s+/g, "") : "";
}

export function isValidCodeText(code: string): boolean {
  return /^[A-Z0-9-]{3,20}$/.test(code);
}

/** PKR off this court fee (never more than the fee). */
export function promoDiscountFor(p: Pick<PromoRules, "type" | "value" | "maxDiscountPkr">, courtFee: number): number {
  const fee = Math.max(0, Math.round(courtFee));
  let off = p.type === "percentage" ? Math.round((fee * p.value) / 100) : Math.round(p.value);
  if (p.type === "percentage" && p.maxDiscountPkr && p.maxDiscountPkr > 0) off = Math.min(off, Math.round(p.maxDiscountPkr));
  return Math.max(0, Math.min(fee, off));
}

export type PromoCheck =
  | { ok: true; code: string; discount: number; description: string }
  | { ok: false; code: string; reasonCode: PromoReason; message: string };

/** Can this customer use this code on this booking? */
export function evaluatePromo(
  promo: PromoRules | null,
  ctx: {
    code: string;
    sport: string;
    courtFee: number;
    now?: number;
    /** Earlier uses by this customer (signed in: account; guest: email). */
    usesByCustomer: number;
    /** Customer has an earlier booking (not cancelled). */
    hasEarlierBooking: boolean;
  },
): PromoCheck {
  const now = ctx.now ?? Date.now();
  const no = (reasonCode: PromoReason): PromoCheck => ({ ok: false, code: ctx.code, reasonCode, message: PROMO_REASON_TEXT[reasonCode] });
  if (!promo) return no("PROMO_NOT_FOUND");
  if (!promo.isActive) return no("PROMO_INACTIVE");
  if (promo.validFrom && new Date(promo.validFrom).getTime() > now) return no("PROMO_NOT_STARTED");
  if (promo.validUntil && new Date(promo.validUntil).getTime() < now) return no("PROMO_EXPIRED");
  if (promo.sports.length > 0 && !promo.sports.includes(ctx.sport)) return no("PROMO_WRONG_SPORT");
  if (promo.minFeePkr && ctx.courtFee < promo.minFeePkr) return no("PROMO_MIN_FEE");
  if (promo.maxUses && (promo.usedCount ?? 0) >= promo.maxUses) return no("PROMO_USED_UP");
  const perCustomer = promo.maxUsesPerCustomer ?? 1;
  if (perCustomer > 0 && ctx.usesByCustomer >= perCustomer) return no("PROMO_ALREADY_USED");
  if (promo.newCustomersOnly && ctx.hasEarlierBooking) return no("PROMO_NEW_CUSTOMERS_ONLY");
  return { ok: true, code: promo.code, discount: promoDiscountFor(promo, ctx.courtFee), description: promo.description ?? "" };
}

export type PromoInput = Omit<PromoRules, "usedCount">;

/** Check what the super admin typed. Returns clean values or an error. */
export function validatePromoInput(
  body: unknown,
  { partial = false }: { partial?: boolean } = {},
): { ok: true; value: Partial<PromoInput> } | { ok: false; error: string } {
  if (!body || typeof body !== "object") return { ok: false, error: "Invalid body." };
  const b = body as Record<string, unknown>;
  const out: Partial<PromoInput> = {};
  const has = (k: string) => b[k] !== undefined;
  const need = (k: string) => !partial || has(k);
  const wholeOrNull = (k: string, min: number, max: number, label: string): string | null => {
    if (!has(k) || b[k] === null || b[k] === "") {
      (out as Record<string, unknown>)[k] = null;
      return null;
    }
    const v = b[k];
    if (typeof v !== "number" || !Number.isInteger(v) || v < min || v > max) return `${label} must be a whole number from ${min} to ${max}.`;
    (out as Record<string, unknown>)[k] = v;
    return null;
  };

  if (need("code")) {
    const code = normaliseCode(b.code);
    if (!isValidCodeText(code)) return { ok: false, error: "Code: 3–20 letters, numbers or dashes." };
    out.code = code;
  }
  if (has("description")) {
    if (typeof b.description !== "string" || b.description.length > 120) return { ok: false, error: "Description: up to 120 characters." };
    out.description = b.description.trim();
  }
  if (need("type")) {
    if (b.type !== "percentage" && b.type !== "fixed") return { ok: false, error: "Type must be percentage or fixed." };
    out.type = b.type;
  }
  if (need("value")) {
    const v = b.value;
    const max = (out.type ?? b.type) === "percentage" ? 100 : 1_000_000;
    if (typeof v !== "number" || !Number.isInteger(v) || v < 1 || v > max) {
      return { ok: false, error: (out.type ?? b.type) === "percentage" ? "Percent off must be 1 to 100." : "PKR off must be a whole amount above 0." };
    }
    out.value = v;
  }
  if (!partial || has("maxDiscountPkr")) { const e = wholeOrNull("maxDiscountPkr", 1, 1_000_000, "Most PKR off"); if (e) return { ok: false, error: e }; }
  if (!partial || has("minFeePkr")) { const e = wholeOrNull("minFeePkr", 1, 1_000_000, "Minimum court fee"); if (e) return { ok: false, error: e }; }
  if (!partial || has("maxUses")) { const e = wholeOrNull("maxUses", 1, 1_000_000, "Total uses"); if (e) return { ok: false, error: e }; }
  if (!partial || has("maxUsesPerCustomer")) {
    if (!has("maxUsesPerCustomer") || b.maxUsesPerCustomer === null) out.maxUsesPerCustomer = 1;
    else { const e = wholeOrNull("maxUsesPerCustomer", 0, 1000, "Uses per customer (0 = no limit)"); if (e) return { ok: false, error: e }; }
  }
  if (need("sports")) {
    const s = has("sports") ? b.sports : [];
    if (!Array.isArray(s) || s.some((x) => !isSportCode(x))) return { ok: false, error: "Unknown sport." };
    out.sports = [...new Set(s as string[])];
  }
  for (const k of ["validFrom", "validUntil"] as const) {
    if (!partial || has(k)) {
      if (!has(k) || b[k] === null || b[k] === "") out[k] = null;
      else {
        const d = typeof b[k] === "string" ? new Date(b[k] as string) : null;
        if (!d || Number.isNaN(d.getTime())) return { ok: false, error: "Dates must be valid dates." };
        out[k] = d;
      }
    }
  }
  if (out.validFrom && out.validUntil && new Date(out.validUntil) <= new Date(out.validFrom)) {
    return { ok: false, error: "The end date must be after the start date." };
  }
  for (const k of ["newCustomersOnly", "isActive"] as const) {
    if (!partial || has(k)) {
      if (!has(k)) out[k] = k === "isActive";
      else if (typeof b[k] !== "boolean") return { ok: false, error: `${k} must be true or false.` };
      else out[k] = b[k] as boolean;
    }
  }
  return { ok: true, value: out };
}
