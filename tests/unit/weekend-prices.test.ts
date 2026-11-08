import { describe, expect, it } from "vitest";
import { calculateOriginalPrice, getPricePerHourForTime, isWeekendSlot } from "@/lib/pricing-utils";
import { startingPricePerHour } from "@/lib/api/catalog";
import { calculateDiscountedPrice, type DiscountInput } from "@/lib/discount-utils";

// 2027-01-08 is a Friday, 2027-01-09 a Saturday, 2027-01-10 a Sunday, 2027-01-11 a Monday.
const FRI = "2027-01-08";
const SAT = "2027-01-09";
const SUN = "2027-01-10";

const flat = { type: "PADEL" as const, pricePerHour: 4000, weekendPricePerHour: 5000 };
const split = {
  type: "PADEL" as const,
  pricePerHour: 4000,
  timeBasedPricingEnabled: true,
  pricingPeriods: [
    { label: "off_peak" as const, startHour: 4, endHour: 17, pricePerHour: 4000, weekendPricePerHour: 4500 },
    { label: "peak" as const, startHour: 17, endHour: 4, pricePerHour: 6000, weekendPricePerHour: null },
  ],
};

describe("which days are weekend", () => {
  it("uses Saturday and Sunday, and moves past midnight to the next day", () => {
    expect(isWeekendSlot(FRI, 10)).toBe(false);
    expect(isWeekendSlot(SAT, 10)).toBe(true);
    expect(isWeekendSlot(SUN, 23.5)).toBe(true);
    expect(isWeekendSlot(SUN, 24)).toBe(false); // Monday 12:00 AM
    expect(isWeekendSlot(FRI, 24.5)).toBe(true); // Saturday 12:30 AM
    expect(isWeekendSlot(null, 10)).toBe(false);
  });
});

describe("weekend prices", () => {
  it("charges the weekend price on Sat/Sun and the normal price otherwise", () => {
    expect(calculateOriginalPrice(flat, 10, 1, FRI).originalPrice).toBe(4000);
    expect(calculateOriginalPrice(flat, 10, 1, SAT).originalPrice).toBe(5000);
    expect(calculateOriginalPrice(flat, 10, 1).originalPrice).toBe(4000); // no date = weekday
  });

  it("splits a Friday-night booking that runs into Saturday", () => {
    // 11 PM Friday to 1 AM Saturday: one hour each side.
    expect(calculateOriginalPrice(flat, 23, 2, FRI).originalPrice).toBe(9000);
  });

  it("uses each period's weekend price, or its normal price when empty", () => {
    expect(getPricePerHourForTime(split, 10, { weekend: true })).toEqual({ pricePerHour: 4500, label: "off_peak" });
    expect(getPricePerHourForTime(split, 20, { weekend: true })).toEqual({ pricePerHour: 6000, label: "peak" });
    expect(calculateOriginalPrice(split, 10, 1, SAT).originalPrice).toBe(4500);
    expect(calculateOriginalPrice(split, 10, 1, FRI).originalPrice).toBe(4000);
  });

  it("courts without a weekend price are unchanged", () => {
    const plain = { type: "PADEL" as const, pricePerHour: 4000 };
    expect(calculateOriginalPrice(plain, 10, 1.5, SAT).originalPrice).toBe(6000);
  });

  it("Futsal weekend prices are per 90 minutes like normal ones", () => {
    const futsal = { type: "FUTSAL" as const, pricePerHour: 6000, weekendPricePerHour: 7500 };
    expect(calculateOriginalPrice(futsal, 18, 1.5, SAT).originalPrice).toBe(7500);
  });

  it("the 'from' price looks at weekend prices too", () => {
    expect(startingPricePerHour({ pricePerHour: 4000, weekendPricePerHour: 3500 })).toBe(3500);
    expect(startingPricePerHour(flat)).toBe(4000);
  });

  it("peak/off-peak discounts use the weekend amounts", () => {
    const discount = {
      _id: "d1", name: "Off-peak 10%", type: "percentage", value: 0, isActive: true,
      validFrom: "2026-01-01", validUntil: "2028-01-01", courtTypes: [], durations: [],
      offPeakDiscount: { type: "percentage", value: 10 },
    } as unknown as DiscountInput;
    const { finalPrice } = calculateDiscountedPrice(4500, [discount], { court: split, startTime: 10, duration: 1, date: SAT });
    expect(finalPrice).toBe(4050);
  });
});
