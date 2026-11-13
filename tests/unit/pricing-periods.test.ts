import { describe, expect, it } from "vitest";
import { checkPricingPeriods } from "@/lib/pricing-periods";
import type { CourtPricingPeriod } from "@/types";

const p = (label: "peak" | "off_peak", startHour: number, endHour: number) =>
  ({ label, startHour, endHour, pricePerHour: 3000 }) as CourtPricingPeriod;

describe("peak/off-peak times", () => {
  it("accepts times that cover the day once", () => {
    expect(checkPricingPeriods([p("off_peak", 0, 18), p("peak", 18, 24)])).toBeNull();
    expect(checkPricingPeriods([p("off_peak", 2, 18), p("peak", 18, 2)])).toBeNull();
    expect(checkPricingPeriods([p("off_peak", 0, 24)])).toBeNull();
  });

  it("rejects overlaps, e.g. Peak 6 PM – 12 PM (noon)", () => {
    const err = checkPricingPeriods([p("off_peak", 0, 18), p("peak", 18, 12)]);
    expect(err).toContain("overlap");
    expect(err).toContain("12:00 AM (midnight)");
    expect(checkPricingPeriods([p("off_peak", 0, 19), p("peak", 18, 24)])).toContain("both include 6:00 PM");
  });

  it("rejects gaps and same start/end", () => {
    expect(checkPricingPeriods([p("off_peak", 0, 17), p("peak", 18, 24)])).toContain("No price is set for 5:00 PM");
    expect(checkPricingPeriods([p("peak", 6, 6)])).toContain("same time");
    expect(checkPricingPeriods([])).not.toBeNull();
  });
});
