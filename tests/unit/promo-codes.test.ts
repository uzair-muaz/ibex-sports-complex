import { describe, expect, it } from "vitest";
import { evaluatePromo, normaliseCode, promoDiscountFor, validatePromoInput, type PromoRules } from "@/lib/promo-rules";
import { computeQuote } from "@/lib/pricing/quote";
import { DEFAULT_APP_SETTINGS } from "@/lib/app-settings";
import { getOpenApiDocument } from "@/lib/api/openapi";

const promo = (o: Partial<PromoRules> = {}): PromoRules => ({
  code: "EID20",
  type: "percentage",
  value: 20,
  sports: [],
  isActive: true,
  usedCount: 0,
  maxUsesPerCustomer: 1,
  ...o,
});
const ctx = { code: "EID20", sport: "PADEL", courtFee: 4500, usesByCustomer: 0, hasEarlierBooking: false, now: Date.parse("2026-11-08T12:00:00+05:00") };

describe("promo code amount", () => {
  it("percentage, with an optional cap; fixed never more than the fee", () => {
    expect(promoDiscountFor(promo(), 4500)).toBe(900);
    expect(promoDiscountFor(promo({ maxDiscountPkr: 500 }), 4500)).toBe(500);
    expect(promoDiscountFor(promo({ type: "fixed", value: 1000 }), 4500)).toBe(1000);
    expect(promoDiscountFor(promo({ type: "fixed", value: 9000 }), 4500)).toBe(4500);
  });
  it("tidies what people type", () => {
    expect(normaliseCode("  eid 20 ")).toBe("EID20");
  });
});

describe("who can use a code", () => {
  it("a good code works", () => {
    expect(evaluatePromo(promo(), ctx)).toMatchObject({ ok: true, discount: 900 });
  });
  const cases: [Partial<PromoRules> | null, Partial<typeof ctx>, string][] = [
    [null, {}, "PROMO_NOT_FOUND"],
    [{ isActive: false }, {}, "PROMO_INACTIVE"],
    [{ validFrom: "2026-12-01T00:00:00+05:00" }, {}, "PROMO_NOT_STARTED"],
    [{ validUntil: "2026-11-01T00:00:00+05:00" }, {}, "PROMO_EXPIRED"],
    [{ sports: ["FUTSAL"] }, {}, "PROMO_WRONG_SPORT"],
    [{ minFeePkr: 5000 }, {}, "PROMO_MIN_FEE"],
    [{ maxUses: 10, usedCount: 10 }, {}, "PROMO_USED_UP"],
    [{}, { usesByCustomer: 1 }, "PROMO_ALREADY_USED"],
    [{ newCustomersOnly: true }, { hasEarlierBooking: true }, "PROMO_NEW_CUSTOMERS_ONLY"],
  ];
  for (const [p, c, reason] of cases) {
    it(reason, () => {
      const r = evaluatePromo(p === null ? null : promo(p), { ...ctx, ...c });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.reasonCode).toBe(reason);
    });
  }
  it("0 uses per customer means no limit", () => {
    expect(evaluatePromo(promo({ maxUsesPerCustomer: 0 }), { ...ctx, usesByCustomer: 5 }).ok).toBe(true);
  });
});

describe("price with a promo code", () => {
  const base = {
    originalCourtFee: 5000,
    courtFee: 4500,
    durationMinutes: 60,
    customer: { pointsBalance: 0, walletBalance: 0 },
    usePoints: false,
    useWallet: false,
    loyalty: DEFAULT_APP_SETTINGS.loyalty,
    minAdvancePercent: 50,
  };
  it("comes off after automatic discounts, before the advance", () => {
    const q = computeQuote({ ...base, promo: { code: "EID20", discount: 900 } });
    expect(q.courtFee).toBe(4500);
    expect(q.promo).toEqual({ code: "EID20", discount: 900, description: "" });
    expect(q.total).toBe(3600);
    expect(q.advanceRequired).toBe(1800);
  });
  it("no code: same as before", () => {
    const q = computeQuote(base);
    expect(q.promo).toBeNull();
    expect(q.total).toBe(4500);
  });
});

describe("admin input", () => {
  it("accepts a normal code and fills defaults", () => {
    const r = validatePromoInput({ code: "eid20", type: "percentage", value: 20 });
    expect(r.ok && r.value).toMatchObject({ code: "EID20", sports: [], maxUsesPerCustomer: 1, isActive: true, newCustomersOnly: false });
  });
  it("refuses bad input", () => {
    expect(validatePromoInput({ code: "x", type: "percentage", value: 20 }).ok).toBe(false);
    expect(validatePromoInput({ code: "BIG", type: "percentage", value: 150 }).ok).toBe(false);
    expect(validatePromoInput({ code: "OK1", type: "fixed", value: 500, sports: ["golf!"] }).ok).toBe(false); // not a sport code
    expect(validatePromoInput({ code: "OK1", type: "fixed", value: 500, validFrom: "2026-12-02", validUntil: "2026-12-01" }).ok).toBe(false);
  });
  it("partial edits only change what was sent", () => {
    const r = validatePromoInput({ isActive: false }, { partial: true });
    expect(r.ok && r.value).toEqual({ isActive: false });
  });
});

describe("docs", () => {
  it("list the promo routes", () => {
    const paths = (getOpenApiDocument() as { paths: Record<string, unknown> }).paths;
    for (const p of ["/api/v1/promo-codes/check", "/api/v1/admin/promo-codes", "/api/v1/admin/promo-codes/{id}"]) expect(paths[p], p).toBeDefined();
  });
});
