import { describe, expect, it } from "vitest";
import { checkHoursForSlot, hoursBySportView, type MembershipForHours } from "@/lib/membership-hours";
import { floorHalf, hoursCover } from "@/lib/membership-hours-rules";
import { cleanHoursBySport, toPublicPlan, validatePlanInput, whatsAppUrlFor } from "@/lib/membership-plans";
import { computeQuote } from "@/lib/pricing/quote";
import { pointsEarnedFor } from "@/lib/loyalty-rules";
import { DEFAULT_APP_SETTINGS, type LoyaltyRules } from "@/lib/app-settings";

// Wednesday 18 Nov 2026, 18:00 PKT; "now" is two days earlier.
const NOW = Date.parse("2026-11-16T10:00:00+05:00");
const gold: MembershipForHours = {
  id: "m1",
  planName: "Gold",
  weekdayOnly: false,
  validUntil: new Date("2026-11-30T23:59:59+05:00"),
  hoursBySport: [
    { sport: "PADEL", total: 10, remaining: 7.5 },
    { sport: "FUTSAL", total: 6, remaining: 0.25 },
  ],
};
const slot = { sport: "PADEL", dateKey: "2026-11-18", startHour: 18 };

describe("can these hours pay for this slot?", () => {
  it("yes, with the sport's hours", () => {
    expect(checkHoursForSlot(gold, slot, NOW)).toEqual({ available: 7.5, canUse: true, reasonCode: null });
  });
  it.each([
    [null, slot, "NO_MEMBERSHIP"],
    [gold, { ...slot, sport: "CRICKET" }, "SPORT_NOT_INCLUDED"],
    [gold, { ...slot, sport: "FUTSAL" }, "NO_HOURS_LEFT"],
    [{ ...gold, weekdayOnly: true }, { ...slot, dateKey: "2026-11-21" }, "WEEKDAYS_ONLY"],
    [gold, { ...slot, dateKey: "2026-12-02" }, "EXPIRES_BEFORE_BOOKING"],
    [gold, { ...slot, dateKey: "2026-11-16", startHour: 11 }, "TOO_SOON"],
  ] as const)("no: %#", (m, s, code) => {
    const r = checkHoursForSlot(m as MembershipForHours | null, s, NOW);
    expect(r.canUse).toBe(false);
    expect(r.reasonCode).toBe(code);
  });
});

describe("how much the hours cover", () => {
  it("uses half hours only", () => {
    expect(floorHalf(7.75)).toBe(7.5);
    expect(floorHalf(0.4)).toBe(0);
  });
  it("covers the whole booking when there are enough hours", () => {
    expect(hoursCover({ available: 7.5, canUse: true, useHours: true, durationHours: 1.5, courtFee: 6750 })).toEqual({ used: 1.5, discount: 6750 });
  });
  it("uses what they have and they pay the rest", () => {
    expect(hoursCover({ available: 1, canUse: true, useHours: true, durationHours: 1.5, courtFee: 6750 })).toEqual({ used: 1, discount: 4500 });
  });
  it("nothing unless asked", () => {
    expect(hoursCover({ available: 5, canUse: true, useHours: false, durationHours: 1, courtFee: 4500 })).toEqual({ used: 0, discount: 0 });
  });
});

describe("quote with hours", () => {
  const rules: LoyaltyRules = { ...DEFAULT_APP_SETTINGS.loyalty, minRedeemPoints: 100, maxRedeemPercent: 50, pkrPerPoint: 1 };
  const base = {
    originalCourtFee: 6000,
    courtFee: 6000,
    durationMinutes: 120,
    customer: { pointsBalance: 5000, walletBalance: 0 },
    useWallet: false,
    loyalty: rules,
    minAdvancePercent: 50,
  };
  it("hours first, then points on what is left, then the advance", () => {
    const q = computeQuote({ ...base, hours: { available: 1, canUse: true, reasonCode: null }, useHours: true, usePoints: true });
    expect(q.hours).toMatchObject({ used: 1, discount: 3000 });
    expect(q.points).toMatchObject({ used: 1500, discount: 1500 });
    expect(q.total).toBe(1500);
    expect(q.advanceRequired).toBe(750);
  });
  it("hours covering everything means nothing to pay", () => {
    const q = computeQuote({ ...base, hours: { available: 9, canUse: true, reasonCode: null }, useHours: true, usePoints: true });
    expect(q.total).toBe(0);
    expect(q.toTransfer).toBe(0);
    expect(q.points?.used).toBe(0);
  });
  it("shows why hours can't be used", () => {
    const q = computeQuote({ ...base, hours: { available: 0, canUse: false, reasonCode: "SPORT_NOT_INCLUDED" }, useHours: true, usePoints: false });
    expect(q.hours).toMatchObject({ canUse: false, reasonCode: "SPORT_NOT_INCLUDED", used: 0 });
    expect(q.total).toBe(6000);
  });
  it("guests get no hours", () => {
    expect(computeQuote({ ...base, customer: null, usePoints: false }).hours).toBeNull();
  });
});

describe("points on the part paid with hours", () => {
  const perHour = { ...DEFAULT_APP_SETTINGS.loyalty, earnBasis: "per_hour" as const, earnPoints: 10, earnOnMembershipHours: false };
  it("per hour: only the hours paid with money earn", () => {
    expect(pointsEarnedFor(perHour, { paidTotal: 1500, durationMinutes: 120, membershipMinutes: 60 })).toBe(10);
    expect(pointsEarnedFor({ ...perHour, earnOnMembershipHours: true }, { paidTotal: 1500, durationMinutes: 120, membershipMinutes: 60 })).toBe(20);
  });
});

describe("plans", () => {
  it("cleans hours per sport", () => {
    expect(cleanHoursBySport([{ sport: "PADEL", hours: 10.2 }, { sport: "golf!", hours: 3 }, { sport: "FUTSAL", hours: 0 }, { sport: "TABLE_TENNIS", hours: 4 }])).toEqual([
      { sport: "PADEL", hours: 10 },
      { sport: "TABLE_TENNIS", hours: 4 }, // a sport added in App Settings
    ]);
  });
  it("public plan shape matches the app's", () => {
    expect(
      toPublicPlan({ _id: { toString: () => "x" }, slug: "gold", name: "Gold", price: 60000, validityDays: 30, badge: "Best value", hoursBySport: [{ sport: "PADEL", hours: 10 }], features: ["Priority booking"], weekdayOnly: false }),
    ).toEqual({ id: "gold", name: "Gold", price: 60000, validityDays: 30, badge: "Best value", hours: [{ sport: "PADEL", hours: 10 }], features: ["Priority booking"], restriction: null });
  });
  it("WhatsApp link", () => {
    expect(whatsAppUrlFor("+92 325 5429429")).toBe("https://wa.me/923255429429");
    expect(whatsAppUrlFor("")).toBeNull();
  });
  it("a new plan needs a name, price and some hours", () => {
    expect(validatePlanInput({ name: "Gold", price: 60000, hoursBySport: [] }, false).ok).toBe(false);
    const ok = validatePlanInput({ name: "Gold Plus", price: 60000, hoursBySport: [{ sport: "PADEL", hours: 10 }] }, false);
    expect(ok).toMatchObject({ ok: true, value: { slug: "gold-plus", validityDays: 30 } });
  });
  it("my hours view", () => {
    expect(hoursBySportView([{ sport: "PADEL", total: 10, remaining: 7.5 }])).toEqual([{ sport: "PADEL", total: 10, used: 2.5, remaining: 7.5 }]);
  });
});
