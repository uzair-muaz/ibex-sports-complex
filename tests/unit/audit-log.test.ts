import { describe, expect, it } from "vitest";
import { auditValue, diffChanges } from "@/lib/audit-rules";
import { getOpenApiDocument } from "@/lib/api/openapi";

describe("audit changes", () => {
  it("lists changed fields with before and after", () => {
    const before = { name: "Padel Court 1", pricePerHour: 6000, pricingPeriods: [{ start: 18, end: 4, price: 6000 }], isActive: true };
    const after = { name: "Padel Court 1", pricePerHour: 6500, pricingPeriods: [{ start: 18, end: 4, price: 7000 }], isActive: true };
    expect(diffChanges(before, after)).toEqual([
      { path: "pricePerHour", from: "6000", to: "6500" },
      { path: "pricingPeriods", from: '[{"start":18,"end":4,"price":6000}]', to: '[{"start":18,"end":4,"price":7000}]' },
    ]);
  });

  it("walks nested settings", () => {
    const c = diffChanges({ loyalty: { pkrPerPoint: 1, maxRedeemPercent: 50 } }, { loyalty: { pkrPerPoint: 2, maxRedeemPercent: 50 } });
    expect(c).toEqual([{ path: "loyalty.pkrPerPoint", from: "1", to: "2" }]);
  });

  it("never stores passwords, tokens or timestamps", () => {
    const c = diffChanges({ password: "a", resetToken: "x", updatedAt: "1", name: "A" }, { password: "b", resetToken: "y", updatedAt: "2", name: "B" });
    expect(c).toEqual([{ path: "name", from: "A", to: "B" }]);
  });

  it("only compares sent fields when asked", () => {
    expect(diffChanges({ name: "Gold", price: 10000 }, { price: 12000 }, { onlyAfterKeys: true })).toEqual([
      { path: "price", from: "10000", to: "12000" },
    ]);
  });

  it("shows new objects field by field and empty as a dash", () => {
    expect(diffChanges(null, { code: "EID20", value: 20 })).toEqual([
      { path: "code", from: "—", to: "EID20" },
      { path: "value", from: "—", to: "20" },
    ]);
    expect(auditValue("")).toBe("—");
    expect(auditValue("x".repeat(400)).length).toBe(301);
  });

  it("is in the docs", () => {
    expect(Object.keys((getOpenApiDocument() as { paths: Record<string, unknown> }).paths)).toContain("/api/v1/admin/audit");
  });
});
