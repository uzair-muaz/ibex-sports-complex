import { describe, expect, it } from "vitest";
import { computeQuote, pointsToEarn } from "@/lib/pricing/quote";
import { DEFAULT_APP_SETTINGS, resolveAppSettings, validateSettingsPatch, type LoyaltyRules } from "@/lib/app-settings";
import { parseSlotStart } from "@/lib/api/availability";

/** The rules in the mobile team's PDF (§13). */
const pdfRules: LoyaltyRules = {
  earnBasis: "per_pkr",
  earnPoints: 10,
  earnPerPkr: 100,
  minRedeemPoints: 500,
  maxRedeemPercent: 100,
  pkrPerPoint: 1,
  signUpBonusPoints: 200,
  earnOnMembershipHours: false,
};

describe("quote", () => {
  it("matches the PDF example exactly", () => {
    const q = computeQuote({
      originalCourtFee: 9000,
      courtFee: 9000,
      durationMinutes: 90,
      customer: { pointsBalance: 1850, walletBalance: 2000 },
      usePoints: true,
      useWallet: true,
      loyalty: pdfRules,
      minAdvancePercent: 50,
    });
    expect(q).toMatchObject({
      courtFee: 9000,
      points: { available: 1850, canUse: true, minToUse: 500, used: 1850, discount: 1850 },
      wallet: { available: 2000, used: 2000 },
      total: 7150,
      advanceRequired: 3575,
      toTransfer: 1575,
      pointsToEarn: 710,
    });
  });

  it("gives guests no points or wallet block", () => {
    const q = computeQuote({
      originalCourtFee: 9000,
      courtFee: 9000,
      durationMinutes: 90,
      customer: null,
      usePoints: true,
      useWallet: true,
      loyalty: pdfRules,
      minAdvancePercent: 50,
    });
    expect(q.points).toBeNull();
    expect(q.wallet).toBeNull();
    expect(q).toMatchObject({ total: 9000, advanceRequired: 4500, toTransfer: 4500 });
  });

  it("rounds the advance UP to a whole rupee", () => {
    const q = computeQuote({
      originalCourtFee: 7151,
      courtFee: 7151,
      durationMinutes: 60,
      customer: null,
      usePoints: false,
      useWallet: false,
      loyalty: pdfRules,
      minAdvancePercent: 50,
    });
    expect(q.advanceRequired).toBe(3576);
  });

  it("does not use points below the minimum, or when not asked", () => {
    const base = {
      originalCourtFee: 6000,
      courtFee: 6000,
      durationMinutes: 60,
      useWallet: false,
      loyalty: pdfRules,
      minAdvancePercent: 50,
    };
    const few = computeQuote({ ...base, customer: { pointsBalance: 400, walletBalance: 0 }, usePoints: true });
    expect(few.points).toMatchObject({ canUse: false, used: 0, discount: 0 });
    expect(few.total).toBe(6000);
    const off = computeQuote({ ...base, customer: { pointsBalance: 1000, walletBalance: 0 }, usePoints: false });
    expect(off.points).toMatchObject({ canUse: true, maxUsable: 1000, used: 0 });
  });

  it("caps points at the % of the court fee (today's staging rule: 50%)", () => {
    const q = computeQuote({
      originalCourtFee: 6000,
      courtFee: 6000,
      durationMinutes: 60,
      customer: { pointsBalance: 5000, walletBalance: 0 },
      usePoints: true,
      useWallet: false,
      loyalty: DEFAULT_APP_SETTINGS.loyalty,
      minAdvancePercent: 50,
    });
    expect(q.points).toMatchObject({ used: 3000, discount: 3000 });
    expect(q).toMatchObject({ total: 3000, advanceRequired: 1500 });
  });

  it("lets points pay the whole fee when allowed; nothing to transfer", () => {
    const q = computeQuote({
      originalCourtFee: 3000,
      courtFee: 3000,
      durationMinutes: 60,
      customer: { pointsBalance: 9999, walletBalance: 0 },
      usePoints: true,
      useWallet: false,
      loyalty: pdfRules,
      minAdvancePercent: 50,
    });
    expect(q).toMatchObject({ total: 0, advanceRequired: 0, toTransfer: 0, pointsToEarn: 0 });
  });

  it("wallet covering the whole advance means nothing to transfer", () => {
    const q = computeQuote({
      originalCourtFee: 6000,
      courtFee: 6000,
      durationMinutes: 60,
      customer: { pointsBalance: 0, walletBalance: 10000 },
      usePoints: false,
      useWallet: true,
      loyalty: pdfRules,
      minAdvancePercent: 50,
    });
    expect(q).toMatchObject({ wallet: { used: 6000 }, toTransfer: 0, remainingAfterAdvance: 0 });
  });

  it("shows promotions separately", () => {
    const q = computeQuote({
      originalCourtFee: 6000,
      courtFee: 5400,
      durationMinutes: 60,
      customer: null,
      usePoints: false,
      useWallet: false,
      loyalty: pdfRules,
      minAdvancePercent: 50,
    });
    expect(q).toMatchObject({ originalCourtFee: 6000, promotionDiscount: 600, courtFee: 5400 });
  });

  it("earns per hour or per amount", () => {
    expect(pointsToEarn(DEFAULT_APP_SETTINGS.loyalty, 9000, 90)).toBe(15);
    expect(pointsToEarn(pdfRules, 7150, 90)).toBe(710);
    expect(pointsToEarn({ ...pdfRules, earnPoints: 0 }, 7150, 90)).toBe(0);
  });
});

describe("points and payment settings", () => {
  it("defaults to today's staging rules and 50% advance", () => {
    const s = resolveAppSettings(null);
    expect(s.loyalty).toMatchObject({ earnBasis: "per_hour", earnPoints: 10, minRedeemPoints: 100, maxRedeemPercent: 50, pkrPerPoint: 1 });
    expect(s.payments.minAdvancePercent).toBe(50);
  });

  it("checks admin changes", () => {
    expect(validateSettingsPatch({ loyalty: { earnBasis: "per_pkr", earnPoints: 10, earnPerPkr: 100 } }).ok).toBe(true);
    expect(validateSettingsPatch({ loyalty: { earnBasis: "per_visit" } }).ok).toBe(false);
    expect(validateSettingsPatch({ loyalty: { maxRedeemPercent: 150 } }).ok).toBe(false);
    expect(validateSettingsPatch({ loyalty: { pkrPerPoint: 0 } }).ok).toBe(false);
    expect(validateSettingsPatch({ payments: { minAdvancePercent: 50.5 } }).ok).toBe(false);
    expect(validateSettingsPatch({ payments: { minAdvancePercent: 30 } }).ok).toBe(true);
  });
});

describe("start time parsing", () => {
  it("reads Pakistan, UTC and other offsets into venue time", () => {
    expect(parseSlotStart("2026-11-05T18:00:00+05:00")).toEqual({ dateKey: "2026-11-05", hour: 18 });
    expect(parseSlotStart("2026-11-05T13:30:00Z")).toEqual({ dateKey: "2026-11-05", hour: 18.5 });
    expect(parseSlotStart("2026-11-05T20:00:00Z")).toEqual({ dateKey: "2026-11-06", hour: 1 });
  });

  it("refuses times off the half hour or badly written", () => {
    expect(parseSlotStart("2026-11-05T18:15:00+05:00")).toBeNull();
    expect(parseSlotStart("2026-11-05 18:00")).toBeNull();
    expect(parseSlotStart(1234)).toBeNull();
  });
});
