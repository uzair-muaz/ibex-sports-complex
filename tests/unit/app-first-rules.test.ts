import { describe, expect, it } from "vitest";
import { earnsPoints, websiteLastDay, websiteWindowError } from "@/lib/app-first-rules";
import { evaluatePromo, type PromoRules } from "@/lib/promo-rules";
import { resolveAppSettings, validateSettingsPatch } from "@/lib/app-settings";

const on = { websiteWindowOn: true, websiteBookingWindowDays: 3 };
const off = { websiteWindowOn: false, websiteBookingWindowDays: 3 };

describe("app-first rules", () => {
  it("are all off by default", () => {
    const a = resolveAppSettings(null).appFirst;
    expect(a).toEqual({ pointsAppOnly: false, websiteWindowOn: false, websiteBookingWindowDays: 3, playStoreUrl: null, appStoreUrl: null });
  });

  it("only app bookings earn points when points are app-only", () => {
    expect(earnsPoints({ pointsAppOnly: false }, undefined)).toBe(true);
    expect(earnsPoints({ pointsAppOnly: true }, "app")).toBe(true);
    expect(earnsPoints({ pointsAppOnly: true }, "web")).toBe(false);
    expect(earnsPoints({ pointsAppOnly: true }, undefined)).toBe(false); // website and staff bookings
  });

  it("limits the website to N days counting today", () => {
    expect(websiteLastDay(off, "2026-11-15")).toBeNull();
    expect(websiteLastDay(on, "2026-11-15")).toBe("2026-11-17");
    expect(websiteWindowError(on, "2026-11-17", "2026-11-15", 14)).toBeNull();
    expect(websiteWindowError(on, "2026-11-18", "2026-11-15", 14)).toBe(
      "On the website you can book up to 3 days ahead. In the IBEX app you can book up to 14 days ahead.",
    );
    expect(websiteWindowError(off, "2026-12-30", "2026-11-15", 14)).toBeNull();
  });

  it("refuses app-only promo codes on the website only", () => {
    const promo: PromoRules = { code: "APP20", type: "percentage", value: 20, sports: [], isActive: true, appOnly: true, maxUsesPerCustomer: 0 };
    const ctx = { code: "APP20", sport: "PADEL", courtFee: 4000, usesByCustomer: 0, hasEarlierBooking: false };
    expect(evaluatePromo(promo, { ...ctx, channel: "web" })).toMatchObject({ ok: false, reasonCode: "PROMO_APP_ONLY" });
    expect(evaluatePromo(promo, { ...ctx, channel: "app" })).toMatchObject({ ok: true, discount: 800 });
    expect(evaluatePromo(promo, { ...ctx, channel: "staff" })).toMatchObject({ ok: true });
    expect(evaluatePromo({ ...promo, appOnly: false }, { ...ctx, channel: "web" })).toMatchObject({ ok: true });
  });

  it("checks the settings the super admin types", () => {
    expect(validateSettingsPatch({ appFirst: { pointsAppOnly: true, websiteBookingWindowDays: 3 } })).toEqual({
      ok: true,
      value: { appFirst: { pointsAppOnly: true, websiteBookingWindowDays: 3 } },
    });
    expect(validateSettingsPatch({ appFirst: { websiteBookingWindowDays: 0 } })).toMatchObject({ ok: false });
    expect(validateSettingsPatch({ appFirst: { playStoreUrl: "https://evil.example.com/x" } })).toMatchObject({ ok: false });
    expect(validateSettingsPatch({ appFirst: { playStoreUrl: "https://play.google.com/store/apps/details?id=com.ibex" } })).toMatchObject({ ok: true });
    expect(validateSettingsPatch({ appFirst: { appStoreUrl: "" } })).toEqual({ ok: true, value: { appFirst: { appStoreUrl: null } } });
  });
});
