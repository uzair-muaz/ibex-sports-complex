import { describe, expect, it } from "vitest";
import {
  DEFAULT_PREFERENCES,
  allowedBySwitches,
  resolvePreferences,
  validatePreferencesPatch,
} from "@/lib/preferences";
import { defaultFaqs } from "@/lib/faqs";
import { DEFAULT_APP_SETTINGS, validateSettingsPatch } from "@/lib/app-settings";

describe("preferences", () => {
  it("new accounts get the defaults", () => {
    expect(resolvePreferences(undefined)).toEqual(DEFAULT_PREFERENCES);
    expect(DEFAULT_PREFERENCES.notifications).toEqual({
      matchReminders: true,
      paymentUpdates: true,
      courtAvailability: false,
      newsletter: false,
    });
  });

  it("keeps saved values and fills the rest", () => {
    const p = resolvePreferences({ skillLevel: "pro", notifications: { newsletter: true } });
    expect(p.skillLevel).toBe("pro");
    expect(p.hand).toBeNull();
    expect(p.notifications).toMatchObject({ newsletter: true, matchReminders: true });
  });

  it("accepts the PDF example", () => {
    const r = validatePreferencesPatch({
      primarySport: "PADEL",
      skillLevel: "intermediate",
      hand: "right",
      courtSide: "left",
      notifications: { matchReminders: true, paymentUpdates: true, courtAvailability: false, newsletter: false },
    });
    expect(r.ok).toBe(true);
  });

  it("only changes what was sent; null clears a choice", () => {
    const r = validatePreferencesPatch({ hand: null, notifications: { newsletter: true } });
    expect(r).toEqual({ ok: true, value: { hand: null, notifications: { newsletter: true } } });
  });

  it.each([
    [{ skillLevel: "expert" }, "skillLevel"],
    [{ hand: "both" }, "hand"],
    [{ courtSide: "middle" }, "courtSide"],
    [{ primarySport: "TENNIS" }, "primarySport"],
    [{ notifications: { matchReminders: "yes" } }, "notifications.matchReminders"],
    [{ notifications: "off" }, "notifications"],
  ])("refuses %j", (body, field) => {
    const r = validatePreferencesPatch(body);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain(field);
  });

  it("refuses a missing body", () => expect(validatePreferencesPatch(null).ok).toBe(false));
});

describe("which messages the switches stop (push and email)", () => {
  const off = (key: keyof typeof DEFAULT_PREFERENCES.notifications) =>
    resolvePreferences({ notifications: { [key]: false } });

  it("match reminders switch stops the 2-hour reminder", () => {
    expect(allowedBySwitches(off("matchReminders"), "booking_reminder")).toBe(false);
    expect(allowedBySwitches(off("matchReminders"), "payment_verified")).toBe(true);
  });
  it("payment updates switch stops payment, wallet and points messages", () => {
    for (const t of ["proof_submitted", "payment_verified", "proof_rejected", "wallet_credited", "points_earned"] as const) {
      expect(allowedBySwitches(off("paymentUpdates"), t)).toBe(false);
    }
  });
  it("cancellations and the booking-received email always go", () => {
    const allOff = resolvePreferences({
      notifications: { matchReminders: false, paymentUpdates: false, courtAvailability: false, newsletter: false },
    });
    expect(allowedBySwitches(allOff, "booking_cancelled")).toBe(true);
    expect(allowedBySwitches(allOff, null)).toBe(true);
  });
});

describe("FAQs", () => {
  it("built-in FAQs use the current rules", () => {
    const s = {
      ...DEFAULT_APP_SETTINGS,
      cancellationNoticeMinutes: 360,
      payments: { ...DEFAULT_APP_SETTINGS.payments, minAdvancePercent: 30 },
    };
    const text = defaultFaqs(s).map((f) => f.answer).join(" ");
    expect(text).toContain("30%");
    expect(text).toContain("6 hours");
    expect(text).toContain(`${s.loyalty.minRedeemPoints} points`);
  });

  it("every built-in FAQ passes the admin's own checks", () => {
    const r = validateSettingsPatch({ faqs: defaultFaqs(DEFAULT_APP_SETTINGS) });
    expect(r.ok).toBe(true);
  });

  it("admin edits: empty rows skipped, empty list means built-in, too short refused", () => {
    expect(validateSettingsPatch({ faqs: [{ question: "", answer: "" }] })).toMatchObject({ ok: true, value: { faqs: null } });
    expect(validateSettingsPatch({ faqs: null })).toMatchObject({ ok: true, value: { faqs: null } });
    expect(validateSettingsPatch({ faqs: [{ question: "Hi", answer: "A real answer" }] }).ok).toBe(false);
    expect(validateSettingsPatch({ faqs: Array(31).fill({ question: "Question?", answer: "Answer." }) }).ok).toBe(false);
  });
});

describe("password reset answer", () => {
  it("link time and the email as entered, normalised", async () => {
    const { RESET_LINK_MINUTES, normaliseResetEmail } = await import("@/lib/password-reset-rules");
    expect(RESET_LINK_MINUTES).toBe(60);
    expect(normaliseResetEmail("  Sara.Khan@Example.COM ")).toBe("sara.khan@example.com");
    expect(normaliseResetEmail(undefined)).toBe("");
  });
});

describe("catalog gaps (G-2, G-3, G-5)", () => {
  it("links use the phone's address only on a laptop", async () => {
    const { chooseBaseUrl } = await import("@/lib/api/base-url");
    expect(chooseBaseUrl("http://localhost:3000", "10.0.2.2:3000", null)).toBe("http://10.0.2.2:3000");
    expect(chooseBaseUrl("http://localhost:3000", "192.168.1.20:3000", "http")).toBe("http://192.168.1.20:3000");
    expect(chooseBaseUrl("https://staging.ibexsportscomplex.com", "evil.example", null)).toBe("https://staging.ibexsportscomplex.com");
    expect(chooseBaseUrl("http://localhost:3000", "bad host/<x>", null)).toBe("http://localhost:3000");
    expect(chooseBaseUrl("http://localhost:3000/", null, null)).toBe("http://localhost:3000");
  });

  it("Futsal shows 5,000 for 90 minutes, not 3,333 per hour", async () => {
    const { startingPriceFor, startingPricePerHour, shortestMinutes } = await import("@/lib/api/catalog");
    const futsal = { type: "FUTSAL", pricePerHour: 5000, isActive: true } as never;
    expect(shortestMinutes({ durationsMinutes: [90, 180] } as never)).toBe(90);
    expect(startingPriceFor(futsal, 90)).toBe(5000);
    expect(startingPricePerHour(futsal)).toBe(3333);
  });

  it("sport card line comes from the courts' features", async () => {
    const { sportFeaturesText } = await import("@/lib/api/catalog");
    const glass = { key: "glass", label: "Panoramic glass" } as const;
    const led = { key: "lighting", label: "LED lighting" } as const;
    expect(sportFeaturesText([{ isIndoor: true, features: [glass, led] }, { isIndoor: true, features: [glass] }])).toBe("Indoor • Panoramic glass • LED lighting");
    expect(sportFeaturesText([{ isIndoor: false }, { isIndoor: true }])).toBe("Indoor & outdoor");
    expect(sportFeaturesText([{ isIndoor: false }])).toBeNull();
    expect(sportFeaturesText([])).toBeNull();
  });
});

describe("nothing hard-coded: membership rules and lengths come from App Settings", () => {
  it("membership rules are saved and checked", async () => {
    const { validateSettingsPatch, DEFAULT_APP_SETTINGS, minDurationMinutesFor } = await import("@/lib/app-settings");
    expect(DEFAULT_APP_SETTINGS.membership).toEqual({ weekdayAdvanceHours: 2, weekendAdvanceHours: 24, carryOverGraceDays: 7 });
    expect(validateSettingsPatch({ membership: { weekendAdvanceHours: 12 } })).toEqual({ ok: true, value: { membership: { weekendAdvanceHours: 12 } } });
    expect(validateSettingsPatch({ membership: { carryOverGraceDays: 400 } }).ok).toBe(false);
    expect(validateSettingsPatch({ membership: { weekdayAdvanceHours: 1.5 } }).ok).toBe(false);
    // The super admin may give Futsal a 60-minute length now.
    expect(minDurationMinutesFor("FUTSAL")).toBe(60);
    expect(validateSettingsPatch({ sports: [{ sport: "FUTSAL", durationsMinutes: [60, 90], defaultDurationMinutes: 60 }] }).ok).toBe(true);
  });
});
