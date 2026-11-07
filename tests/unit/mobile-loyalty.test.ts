import { describe, expect, it } from "vitest";
import { maxUsablePoints, pointsDiscountPkr, pointsEarnedFor } from "@/lib/loyalty-rules";
import { DEFAULT_APP_SETTINGS, type LoyaltyRules } from "@/lib/app-settings";
import { loyaltyRulesView, mapTransaction, publicRules } from "@/lib/api/loyalty-view";
import { getOpenApiDocument } from "@/lib/api/openapi";

const today = DEFAULT_APP_SETTINGS.loyalty;
const pdf: LoyaltyRules = {
  earnBasis: "per_pkr",
  earnPoints: 10,
  earnPerPkr: 100,
  minRedeemPoints: 500,
  maxRedeemPercent: 100,
  pkrPerPoint: 1,
  signUpBonusPoints: 200,
  earnOnMembershipHours: false,
};

describe("points rules from settings", () => {
  it("default settings give exactly the website's old answers", () => {
    // Old website answers: from 100 points, up to 50% of the fee.
    for (const [balance, price, expected] of [[0, 9000, 0], [99, 9000, 0], [100, 9000, 100], [5000, 9000, 4500], [5000, 150, 0]]) {
      expect(maxUsablePoints(balance, price, today)).toBe(expected);
    }
    expect(pointsEarnedFor(today, { paidTotal: 9000, durationMinutes: 90 })).toBe(15);
  });

  it("the mobile team's rules", () => {
    expect(pointsEarnedFor(pdf, { paidTotal: 7150, durationMinutes: 90 })).toBe(710);
    expect(maxUsablePoints(1850, 9000, pdf)).toBe(1850);
    expect(maxUsablePoints(499, 9000, pdf)).toBe(0); // below minimum
    expect(maxUsablePoints(20000, 9000, pdf)).toBe(9000); // up to the full fee
  });

  it("point value changes the discount", () => {
    expect(pointsDiscountPkr(1000, 9000, { ...pdf, pkrPerPoint: 0.5 })).toBe(500);
    expect(pointsDiscountPkr(20000, 9000, pdf)).toBe(9000); // never more than the fee
    expect(maxUsablePoints(20000, 9000, { ...pdf, pkrPerPoint: 2 })).toBe(4500);
  });

  it("membership hours earn nothing unless turned on", () => {
    const b = { paidTotal: 0, durationMinutes: 60, membershipMinutes: 60, membershipValuePkr: 4500 };
    expect(pointsEarnedFor(today, b)).toBe(0);
    expect(pointsEarnedFor({ ...today, earnOnMembershipHours: true }, b)).toBe(10);
  });
});

describe("points history shown in the app", () => {
  const t = (type: "earn" | "redeem" | "refund" | "bonus" | "adjust", points: number) => ({
    _id: "t1",
    type,
    points,
    bookingId: "b1",
    createdAt: new Date("2026-11-05T14:30:00Z"),
  });
  it("maps types and statuses", () => {
    expect(mapTransaction(t("earn", 600), "Padel match · IBX-8821")).toEqual({
      id: "t1",
      type: "earned",
      status: "completed",
      points: 600,
      title: "Points earned · Padel match · IBX-8821",
      bookingId: "b1",
      date: "2026-11-05T19:30:00+05:00",
    });
    expect(mapTransaction(t("redeem", -1850), null)).toMatchObject({ type: "redeemed", status: "applied", points: -1850, title: "Points used" });
    expect(mapTransaction(t("refund", 1850), null).type).toBe("returned");
    expect(mapTransaction(t("bonus", 200), null)).toMatchObject({ type: "bonus", title: "Welcome bonus" });
    expect(mapTransaction(t("adjust", -10), null).type).toBe("adjusted");
  });

  it("rules sent to the app", () => {
    expect(publicRules(pdf)).toEqual({
      earnBasis: "per_pkr",
      earnPoints: 10,
      earnPerPkr: 100,
      minRedeemPoints: 500,
      maxRedeemPercent: 100,
      signUpBonusPoints: 200,
      earnOnMembershipHours: false,
    });
  });

  it("public rules for guests: same values, plus pkrPerPoint", () => {
    const view = loyaltyRulesView({ ...pdf, pkrPerPoint: 2 });
    expect(view).toEqual({ pkrPerPoint: 2, rules: publicRules(pdf) });
    expect(JSON.stringify(view)).not.toMatch(/balance|userId/);
  });

  it("public rules route is in the docs with no sign-in", () => {
    const op = (getOpenApiDocument() as { paths: Record<string, { get?: { security?: unknown } }> }).paths["/api/v1/loyalty/rules"];
    expect(op?.get).toBeDefined();
    expect(op?.get?.security).toBeUndefined();
  });
});
