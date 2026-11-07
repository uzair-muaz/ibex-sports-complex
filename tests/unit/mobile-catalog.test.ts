import { describe, expect, it } from "vitest";
import {
  DEFAULT_APP_SETTINGS,
  resolveAppSettings,
  validateSettingsPatch,
} from "@/lib/app-settings";
import { freeStartTimes, overlapsBooking, pakistanNow } from "@/lib/booking-overlap";
import {
  absoluteUrl,
  mobileCourtFields,
  mobileSports,
  roundPkr,
  startingPricePerHour,
  type CourtSource,
} from "@/lib/api/catalog";
import { validateProfilePatch } from "@/lib/api/profile";
import { sanitizeCourtAppFields } from "@/lib/court-app-fields";
import { normalizePakPhone } from "@/lib/phone";

const padel: CourtSource = {
  _id: { toString: () => "c_1" },
  name: "Padel Court 1",
  type: "PADEL",
  image: "",
  pricePerHour: 6000,
  timeBasedPricingEnabled: true,
  pricingPeriods: [
    { label: "off_peak", startHour: 0, endHour: 17, pricePerHour: 4500 },
    { label: "peak", startHour: 17, endHour: 24, pricePerHour: 6000 },
  ],
};

describe("app settings", () => {
  it("uses today's values when nothing is saved", () => {
    const s = resolveAppSettings(null);
    expect(s.cancellationNoticeMinutes).toBe(240);
    const futsal = s.sports.find((x) => x.sport === "FUTSAL")!;
    expect(futsal.durationsMinutes).toEqual([90, 180]);
    expect(s.sports.find((x) => x.sport === "CRICKET")!.showInApp).toBe(false);
  });

  it("puts saved values over the defaults", () => {
    const s = resolveAppSettings({
      venue: { hoursLabel: "Open 24 hours" },
      sports: [{ sport: "PADEL", durationsMinutes: [120, 60], defaultDurationMinutes: 999 }],
      cancellationNoticeMinutes: 120,
    });
    expect(s.venue.hoursLabel).toBe("Open 24 hours");
    expect(s.venue.name).toBe(DEFAULT_APP_SETTINGS.venue.name);
    const p = s.sports.find((x) => x.sport === "PADEL")!;
    expect(p.durationsMinutes).toEqual([60, 120]);
    expect(p.defaultDurationMinutes).toBe(60); // falls back to a valid one
    expect(s.cancellationNoticeMinutes).toBe(120);
  });

  it("accepts a good admin change", () => {
    const r = validateSettingsPatch({
      cancellationNoticeMinutes: 180,
      sports: [{ sport: "FUTSAL", durationsMinutes: [180, 90, 90], defaultDurationMinutes: 90 }],
      venue: { email: "a@b.com", latitude: 33.5 },
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.sports![0].durationsMinutes).toEqual([90, 180]);
  });

  it("refuses bad admin changes", () => {
    expect(validateSettingsPatch({ cancellationNoticeMinutes: -1 }).ok).toBe(false);
    expect(validateSettingsPatch({ sports: [{ sport: "FUTSAL", durationsMinutes: [60] }] }).ok).toBe(false);
    expect(validateSettingsPatch({ sports: [{ sport: "PADEL", durationsMinutes: [75] }] }).ok).toBe(false);
    expect(validateSettingsPatch({ sports: [{ sport: "TENNIS" }] }).ok).toBe(false);
    expect(validateSettingsPatch({ venue: { email: "nope" } }).ok).toBe(false);
    expect(validateSettingsPatch({ venue: { latitude: 200 } }).ok).toBe(false);
    expect(validateSettingsPatch({ venue: { name: "  " } }).ok).toBe(false);
  });
});

describe("free start times", () => {
  it("detects overlaps, including games from the day before past midnight", () => {
    expect(overlapsBooking("2026-11-05", 18, 1.5, { date: "2026-11-05", startTime: 19, duration: 1 })).toBe(true);
    expect(overlapsBooking("2026-11-05", 18, 1, { date: "2026-11-05", startTime: 19, duration: 1 })).toBe(false);
    expect(overlapsBooking("2026-11-05", 0.5, 1, { date: "2026-11-04", startTime: 23.5, duration: 2 })).toBe(true);
  });

  it("counts free half-hour starts from a given hour", () => {
    const free = freeStartTimes("2026-11-05", 1, [{ date: "2026-11-05", startTime: 20, duration: 1 }], 18);
    // 18.0..23.5 = 12 starts; 19.5 and 20.0 and 20.5 clash with 20–21.
    expect(free).toEqual([18, 18.5, 19, 21, 21.5, 22, 22.5, 23, 23.5]);
  });

  it("blocks a late start that runs into tomorrow's early booking", () => {
    const free = freeStartTimes("2026-11-05", 1.5, [{ date: "2026-11-06", startTime: 0, duration: 1 }], 22);
    expect(free).toEqual([22, 22.5]);
  });

  it("knows venue time", () => {
    const n = pakistanNow(new Date("2026-11-05T13:10:00Z"));
    expect(n.dateKey).toBe("2026-11-05");
    expect(n.nextStartHour).toBe(18.5);
    expect(pakistanNow(new Date("2026-11-05T20:00:00Z")).dateKey).toBe("2026-11-06");
  });
});

describe("court and sport cards", () => {
  it("rounds PKR half up", () => {
    expect(roundPkr(3333.5)).toBe(3334);
    expect(roundPkr(3333.49)).toBe(3333);
  });

  it("makes photo links absolute", () => {
    expect(absoluteUrl("/images/a.jpg", "https://x.com/")).toBe("https://x.com/images/a.jpg");
    expect(absoluteUrl("https://cdn/a.jpg", "https://x.com")).toBe("https://cdn/a.jpg");
    expect(absoluteUrl("", "https://x.com")).toBeNull();
  });

  it("finds the cheapest hourly price (Futsal stored per 90 min)", () => {
    expect(startingPricePerHour(padel)).toBe(4500);
    expect(
      startingPricePerHour({ ...padel, type: "FUTSAL", timeBasedPricingEnabled: false, pricePerHour: 5000 }),
    ).toBe(3333);
  });

  it("builds the app's court fields", () => {
    const sportRules = resolveAppSettings(null).sports.find((s) => s.sport === "PADEL")!;
    const fields = mobileCourtFields(
      { ...padel, features: [{ key: "lighting", label: "LED lighting" }] },
      {
        baseUrl: "https://x.com",
        sportRules,
        todayKey: "2026-11-05",
        fromHour: 21,
        bookings: [{ date: "2026-11-05", startTime: 22, duration: 2 }],
      },
    );
    expect(fields).toMatchObject({
      id: "c_1",
      sport: "PADEL",
      imageUrl: "https://x.com/images/paddle.jpg",
      startingPricePerHour: 4500,
      features: [{ key: "lighting", label: "LED lighting" }],
      highlight: null,
    });
    // Default Padel game is 90 min; every start from 21:00 runs into the 22:00–24:00 booking.
    expect(fields.slotsOpenToday).toBe(0);
    expect(fields.hasPeakSlotsOpen).toBe(false);
  });

  it("lists only sports shown in the app, with court counts", () => {
    const sports = mobileSports(resolveAppSettings(null), [padel], "https://x.com");
    expect(sports.map((s) => s.sport)).toEqual(["PADEL", "PICKLEBALL", "FUTSAL"]);
    expect(sports[0]).toMatchObject({ courtCount: 1, fromPricePerHour: 4500 });
    expect(sports[1]).toMatchObject({ courtCount: 0, fromPricePerHour: null });
  });
});

describe("profile changes", () => {
  const today = "2026-11-07";

  it("accepts the app's fields and stores phone as +92", () => {
    const r = validateProfilePatch(
      { firstName: "Hamza", lastName: "Khan", phone: "0300-8521942", dateOfBirth: "1995-06-12", gender: "male", city: "Islamabad" },
      "Old Name",
      today,
    );
    expect(r).toEqual({
      ok: true,
      updates: {
        name: "Hamza Khan",
        phone: "+923008521942",
        dateOfBirth: "1995-06-12",
        gender: "male",
        city: "Islamabad",
      },
    });
  });

  it("changes only the last name when only that is sent", () => {
    const r = validateProfilePatch({ lastName: "Ali" }, "Hamza Khan", today);
    expect(r.ok && r.updates.name).toBe("Hamza Ali");
  });

  it("keeps the website's { name, phone } working; empty phone means no change", () => {
    const r = validateProfilePatch({ name: "Web User", phone: "" }, "x", today);
    expect(r).toEqual({ ok: true, updates: { name: "Web User" } });
  });

  it("refuses bad input with the right code", () => {
    expect(validateProfilePatch({ phone: "12345" }, "x", today)).toMatchObject({ ok: false, code: "INVALID_PHONE" });
    expect(validateProfilePatch({ dateOfBirth: "2030-01-01" }, "x", today)).toMatchObject({ ok: false });
    expect(validateProfilePatch({ dateOfBirth: "1995-02-30" }, "x", today)).toMatchObject({ ok: false });
    expect(validateProfilePatch({ gender: "other" }, "x", today)).toMatchObject({ ok: false });
    expect(validateProfilePatch({ firstName: "" }, "x y", today)).toMatchObject({ ok: false });
  });

  it("clears optional fields with null", () => {
    const r = validateProfilePatch({ dateOfBirth: null, gender: null, city: "" }, "x", today);
    expect(r).toEqual({ ok: true, updates: { dateOfBirth: null, gender: null, city: null } });
  });
});

describe("court app fields and phones", () => {
  it("fills feature labels from keys and refuses unknown keys", () => {
    const r = sanitizeCourtAppFields({ features: ["lighting", "lighting", { key: "video", label: "Replays" }], highlight: "glass" });
    expect(r).toEqual({
      ok: true,
      value: {
        features: [
          { key: "lighting", label: "LED lighting" },
          { key: "video", label: "Replays" },
        ],
        highlight: { key: "glass", label: "Panoramic glass" },
      },
    });
    expect(sanitizeCourtAppFields({ features: ["jacuzzi"] }).ok).toBe(false);
    expect(sanitizeCourtAppFields({ image: "http://insecure/x.jpg" }).ok).toBe(false);
  });

  it("leaves out fields that were not sent", () => {
    expect(sanitizeCourtAppFields({ name: "x" })).toEqual({ ok: true, value: {} });
  });

  it("normalizes Pakistani mobiles", () => {
    expect(normalizePakPhone("03008521942")).toBe("+923008521942");
    expect(normalizePakPhone("+92 300 8521942")).toBe("+923008521942");
    expect(normalizePakPhone("0511234567")).toBeNull();
  });
});
