import { describe, expect, it } from "vitest";
import {
  closureAppliesTo,
  closureSpan,
  closureText,
  DEFAULT_CLOSED_TEXT,
  pkDateKey,
  validateClosureInput,
} from "@/lib/closure-rules";
import { overlapsBooking, freeStartTimes } from "@/lib/booking-overlap";
import { closedTimesView } from "@/lib/api/closure-view";
import { validateBroadcastInput } from "@/lib/broadcast-rules";
import { allowedBySwitches, DEFAULT_PREFERENCES, SWITCH_FOR_TYPE } from "@/lib/preferences";
import { NOTIFICATION_TYPES } from "@/models/Notification";
import { getOpenApiDocument } from "@/lib/api/openapi";

const NOW = new Date("2026-11-08T10:00:00+05:00");
const COURT = "69607301a5bc0098eadcfa85";
const OTHER = "69638b691a31654c30151544";

describe("closure timeline", () => {
  it("turns a closure into a span in venue time", () => {
    expect(closureSpan({ startsAt: "2026-11-13T09:00:00+05:00", endsAt: "2026-11-13T14:00:00+05:00" })).toEqual({
      date: "2026-11-13",
      startTime: 9,
      duration: 5,
    });
  });

  it("works across midnight and for whole days", () => {
    const span = closureSpan({ startsAt: "2026-11-13T22:00:00+05:00", endsAt: "2026-11-15T00:00:00+05:00" });
    expect(span).toEqual({ date: "2026-11-13", startTime: 22, duration: 26 });
    // A game the next day at 6 PM is inside it; one at midnight after is not.
    expect(overlapsBooking("2026-11-14", 18, 1, span)).toBe(true);
    expect(overlapsBooking("2026-11-15", 0, 1, span)).toBe(false);
    // 9 PM for 90 minutes runs into the closure.
    expect(overlapsBooking("2026-11-13", 21, 1.5, span)).toBe(true);
    expect(overlapsBooking("2026-11-13", 20.5, 1.5, span)).toBe(false);
  });

  it("hides closed start times", () => {
    const span = closureSpan({ startsAt: "2026-11-13T09:00:00+05:00", endsAt: "2026-11-13T11:00:00+05:00" });
    const free = freeStartTimes("2026-11-13", 1, [span]);
    expect(free).not.toContain(8.5);
    expect(free).not.toContain(10.5);
    expect(free).toContain(8);
    expect(free).toContain(11);
  });

  it("empty court list means every court", () => {
    expect(closureAppliesTo({ courtIds: [] }, COURT)).toBe(true);
    expect(closureAppliesTo({ courtIds: [COURT] }, COURT)).toBe(true);
    expect(closureAppliesTo({ courtIds: [COURT] }, OTHER)).toBe(false);
  });

  it("customer text falls back to a default", () => {
    expect(closureText({ publicNote: "" })).toBe(DEFAULT_CLOSED_TEXT);
    expect(closureText({ publicNote: " Closed for repairs. " })).toBe("Closed for repairs.");
  });

  it("venue date key uses Pakistan time", () => {
    expect(pkDateKey("2026-11-12T20:00:00Z")).toBe("2026-11-13");
  });

  it("app view gives start, end and note once per closure", () => {
    const span = { ...closureSpan({ startsAt: "2026-11-13T09:00:00+05:00", endsAt: "2026-11-13T14:00:00+05:00" }), closureId: "a", note: "Closed." };
    expect(closedTimesView([span, span])).toEqual([
      { start: "2026-11-13T09:00:00+05:00", end: "2026-11-13T14:00:00+05:00", note: "Closed." },
    ]);
  });
});

describe("closure form", () => {
  const good = {
    courtIds: [COURT],
    startsAt: "2026-11-13T09:00:00+05:00",
    endsAt: "2026-11-13T14:00:00+05:00",
    reason: "Glass repair",
    publicNote: "Closed for maintenance.",
  };

  it("accepts a good closure", () => {
    const r = validateClosureInput(good, { now: NOW });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.courtIds).toEqual([COURT]);
  });

  it("checks times, length, past and reason", () => {
    const err = (b: object) => {
      const r = validateClosureInput({ ...good, ...b }, { now: NOW });
      return r.ok ? null : r.error;
    };
    expect(err({ startsAt: "2026-11-13T09:15:00+05:00" })).toMatch(/half hour/);
    expect(err({ endsAt: "2026-11-13T09:00:00+05:00" })).toMatch(/after the start/);
    expect(err({ endsAt: "2027-03-13T09:00:00+05:00" })).toMatch(/90 days/);
    expect(err({ startsAt: "2026-11-01T09:00:00+05:00", endsAt: "2026-11-02T09:00:00+05:00" })).toMatch(/passed/);
    expect(err({ reason: "x" })).toMatch(/reason/);
    expect(err({ courtIds: ["nope"] })).toMatch(/courts/);
    expect(err({ publicNote: "x".repeat(201) })).toMatch(/200/);
  });

  it("editing changes only what was sent", () => {
    const first = validateClosureInput(good, { now: NOW });
    if (!first.ok) throw new Error("bad");
    const r = validateClosureInput({ endsAt: "2026-11-13T16:00:00+05:00" }, { partial: true, existing: first.value, now: NOW });
    expect(r.ok && r.value.endsAt.toISOString()).toBe("2026-11-13T11:00:00.000Z");
    expect(r.ok && r.value.reason).toBe("Glass repair");
  });
});

describe("messages to customers", () => {
  it("checks the form", () => {
    const base = { title: "Closed Friday", body: "Padel closed Friday morning.", kind: "venue_news", audience: "all" };
    expect(validateBroadcastInput(base).ok).toBe(true);
    expect(validateBroadcastInput({ ...base, title: "x" }).ok).toBe(false);
    expect(validateBroadcastInput({ ...base, kind: "spam" }).ok).toBe(false);
    expect(validateBroadcastInput({ ...base, audience: "closure" }).ok).toBe(false);
    expect(validateBroadcastInput({ ...base, audience: "closure", closureId: "6750a1b2c3d4e5f601234567" }).ok).toBe(true);
    expect(validateBroadcastInput({ ...base, audience: "one", email: "bad" }).ok).toBe(false);
    const one = validateBroadcastInput({ ...base, audience: "one", email: " A@Example.com " });
    expect(one.ok && one.value.email).toBe("a@example.com");
  });

  it("venue news always pushes; offers follow the newsletter switch", () => {
    expect(NOTIFICATION_TYPES).toContain("venue_news");
    expect(NOTIFICATION_TYPES).toContain("offer");
    expect(SWITCH_FOR_TYPE.venue_news).toBeNull();
    expect(allowedBySwitches(DEFAULT_PREFERENCES, "venue_news")).toBe(true);
    expect(allowedBySwitches(DEFAULT_PREFERENCES, "offer")).toBe(false);
    const on = { ...DEFAULT_PREFERENCES, notifications: { ...DEFAULT_PREFERENCES.notifications, newsletter: true } };
    expect(allowedBySwitches(on, "offer")).toBe(true);
  });
});

describe("docs", () => {
  it("lists the new routes", () => {
    const paths = Object.keys((getOpenApiDocument() as { paths: Record<string, unknown> }).paths);
    for (const p of ["/api/v1/venue/closures", "/api/v1/admin/closures", "/api/v1/admin/closures/{id}", "/api/v1/admin/broadcasts"]) {
      expect(paths).toContain(p);
    }
  });
});
