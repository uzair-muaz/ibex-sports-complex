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
