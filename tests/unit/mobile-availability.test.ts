import { describe, expect, it } from "vitest";
import { buildCourtSlots, checkAvailabilityRequest, slotStartIso } from "@/lib/api/availability";
import type { DiscountInput } from "@/lib/discount-utils";

const padel = {
  type: "PADEL" as const,
  pricePerHour: 6000,
  timeBasedPricingEnabled: true,
  pricingPeriods: [
    { label: "off_peak" as const, startHour: 0, endHour: 17, pricePerHour: 4500 },
    { label: "peak" as const, startHour: 17, endHour: 24, pricePerHour: 6000 },
  ],
};

const futsal = { type: "FUTSAL" as const, pricePerHour: 5000, timeBasedPricingEnabled: false, pricingPeriods: [] };
const plain = { type: "PICKLEBALL" as const, pricePerHour: 3000, timeBasedPricingEnabled: false, pricingPeriods: [] };

const rules = { durationsMinutes: [60, 90, 120], bookingWindowDays: 14 };

describe("availability request checks", () => {
  const today = "2026-11-07";
  it("accepts today and the last day of the window", () => {
    expect(checkAvailabilityRequest({ date: today, durationMinutes: 90, rules, todayKey: today })).toEqual({ ok: true });
    expect(checkAvailabilityRequest({ date: "2026-11-20", durationMinutes: 60, rules, todayKey: today })).toEqual({ ok: true });
  });
  it("uses the app's error codes", () => {
    expect(checkAvailabilityRequest({ date: "2026-11-06", durationMinutes: 60, rules, todayKey: today })).toMatchObject({ code: "DATE_IN_PAST" });
    expect(checkAvailabilityRequest({ date: "2026-11-21", durationMinutes: 60, rules, todayKey: today })).toMatchObject({ code: "DATE_OUT_OF_WINDOW" });
    expect(checkAvailabilityRequest({ date: today, durationMinutes: 45, rules, todayKey: today })).toMatchObject({ code: "INVALID_DURATION" });
    expect(checkAvailabilityRequest({ date: today, durationMinutes: NaN, rules, todayKey: today })).toMatchObject({ code: "INVALID_DURATION" });
    expect(checkAvailabilityRequest({ date: "2026-02-30", durationMinutes: 60, rules, todayKey: today })).toMatchObject({ code: "VALIDATION_ERROR" });
  });
});

describe("court slots", () => {
  it("formats starts in Pakistan time", () => {
    expect(slotStartIso("2026-11-05", 17.5)).toBe("2026-11-05T17:30:00+05:00");
    expect(slotStartIso("2026-11-05", 0)).toBe("2026-11-05T00:00:00+05:00");
  });

  it("sends all 48 starts, taken ones marked unavailable", () => {
    const slots = buildCourtSlots({
      court: padel,
      dateKey: "2026-11-05",
      durationMinutes: 90,
      bookings: [{ date: "2026-11-05", startTime: 18, duration: 1 }],
      discounts: [],
    });
    expect(slots).toHaveLength(48);
    const at = (h: string) => slots.find((s) => s.start === `2026-11-05T${h}:00+05:00`)!;
    expect(at("16:30").available).toBe(true); // 16:30–18:00 ends exactly when the booking starts
    expect(at("17:00").available).toBe(false); // 17:00–18:30 overlaps 18:00–19:00
    expect(slots.filter((s) => !s.available).map((s) => s.start.slice(11, 16))).toEqual(["17:00", "17:30", "18:00", "18:30"]);
  });

  it("marks clashes correctly at the edges", () => {
    const slots = buildCourtSlots({
      court: padel,
      dateKey: "2026-11-05",
      durationMinutes: 60,
      bookings: [{ date: "2026-11-05", startTime: 18, duration: 1 }],
      discounts: [],
    });
    const at = (h: string) => slots.find((s) => s.start === `2026-11-05T${h}:00+05:00`)!;
    expect(at("17:00").available).toBe(true); // ends exactly at 18:00
    expect(at("17:30").available).toBe(false);
    expect(at("18:30").available).toBe(false);
    expect(at("19:00").available).toBe(true);
  });

  it("prices the full duration across peak and off-peak, in whole PKR", () => {
    const slots = buildCourtSlots({ court: padel, dateKey: "2026-11-05", durationMinutes: 90, bookings: [], discounts: [] });
    const at = (h: string) => slots.find((s) => s.start === `2026-11-05T${h}:00+05:00`)!;
    expect(at("12:00")).toMatchObject({ rateType: "off_peak", price: 6750 }); // 1.5 h × 4500
    expect(at("16:30")).toMatchObject({ rateType: "off_peak", price: 8250 }); // 0.5 h × 4500 + 1 h × 6000
    expect(at("18:00")).toMatchObject({ rateType: "peak", price: 9000 });
  });

  it("gives Futsal 5,000 per 90 minutes and 'standard' when there are no periods", () => {
    const f = buildCourtSlots({ court: futsal, dateKey: "2026-11-05", durationMinutes: 90, bookings: [], discounts: [] });
    expect(f[0]).toMatchObject({ rateType: "standard", price: 5000 });
    const f2 = buildCourtSlots({ court: futsal, dateKey: "2026-11-05", durationMinutes: 180, bookings: [], discounts: [] });
    expect(f2[0].price).toBe(10000);
    expect(Number.isInteger(buildCourtSlots({ court: futsal, dateKey: "2026-11-05", durationMinutes: 120, bookings: [], discounts: [] })[0].price)).toBe(true);
  });

  it("hides starts that are already past", () => {
    const slots = buildCourtSlots({ court: plain, dateKey: "2026-11-05", durationMinutes: 60, bookings: [], discounts: [], fromHour: 22.5 });
    expect(slots.map((s) => s.start.slice(11, 16))).toEqual(["22:30", "23:00", "23:30"]);
  });

  it("blocks late starts that run into tomorrow's booking", () => {
    const slots = buildCourtSlots({
      court: plain,
      dateKey: "2026-11-05",
      durationMinutes: 60,
      bookings: [{ date: "2026-11-06", startTime: 0, duration: 1 }],
      discounts: [],
      fromHour: 23,
    });
    expect(slots.map((s) => s.available)).toEqual([true, false]);
  });

  it("applies automatic discounts to price but keeps originalPrice", () => {
    const tenPercent: DiscountInput = {
      _id: "d1",
      name: "10% off",
      type: "percentage",
      value: 10,
      courtTypes: ["PICKLEBALL"],
      allDay: true,
      startHour: 0,
      endHour: 24,
      validFrom: "2026-01-01",
      validUntil: "2027-01-01",
      isActive: true,
    };
    const slots = buildCourtSlots({ court: plain, dateKey: "2026-11-05", durationMinutes: 60, bookings: [], discounts: [tenPercent] });
    expect(slots[0]).toMatchObject({ originalPrice: 3000, price: 2700 });
  });
});
