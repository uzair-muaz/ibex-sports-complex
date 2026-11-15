import { describe, expect, it } from "vitest";
import { customerCanCancelBooking, isWeekendDateKey } from "@/lib/membership-rules";
import { checkHoursForSlot } from "@/lib/membership-hours";
import {
  isCustomerRole,
  isStaffRole,
  isSuperAdminRole,
} from "@/lib/authz";
import {
  createTrustedApiActor,
  isTrustedApiActor,
} from "@/lib/trusted-api-actor";

// Points rules are tested with App Settings values in mobile-loyalty.test.ts.

describe("membership-rules", () => {
  it("detects weekends", () => {
    expect(isWeekendDateKey("2026-08-08")).toBe(true); // Sat
    expect(isWeekendDateKey("2026-08-09")).toBe(true); // Sun
    expect(isWeekendDateKey("2026-08-10")).toBe(false); // Mon
  });

  it("members can use hours for any free slot, even one starting soon", () => {
    const m = {
      id: "m1",
      planName: "Gold",
      weekdayOnly: false,
      validUntil: new Date("2026-12-31T00:00:00+05:00"),
      hoursBySport: [{ sport: "PADEL", total: 10, remaining: 10 }],
    };
    // Say it is Fri 7 PM: Sat 6 PM (23 hours away) and Fri 7:30 PM (30 minutes away) are both fine.
    expect(checkHoursForSlot(m, { sport: "PADEL", dateKey: "2026-08-08", startHour: 18 }).canUse).toBe(true);
    expect(checkHoursForSlot(m, { sport: "PADEL", dateKey: "2026-08-07", startHour: 19.5 }).canUse).toBe(true);
    // Weekday-only plan on a Saturday.
    expect(checkHoursForSlot({ ...m, weekdayOnly: true }, { sport: "PADEL", dateKey: "2026-08-08", startHour: 18 }).reasonCode).toBe("WEEKDAYS_ONLY");
  });

  it("allows cancel when far enough before start", () => {
    const now = new Date(2026, 7, 10, 10, 0, 0);
    expect(
      customerCanCancelBooking({
        status: "confirmed",
        date: "2026-08-10",
        startTime: 18,
        noticeMinutes: 240,
        now,
      }),
    ).toBe(true);
    expect(
      customerCanCancelBooking({
        status: "confirmed",
        date: "2026-08-10",
        startTime: 12,
        noticeMinutes: 240,
        now,
      }),
    ).toBe(false);
    // The super admin shortens the notice to 1 hour: 2 hours before is now fine.
    expect(
      customerCanCancelBooking({ status: "confirmed", date: "2026-08-10", startTime: 12, noticeMinutes: 60, now }),
    ).toBe(true);
  });
});

describe("authz", () => {
  it("classifies roles", () => {
    expect(isStaffRole("admin")).toBe(true);
    expect(isStaffRole("super_admin")).toBe(true);
    expect(isStaffRole("user")).toBe(false);
    expect(isCustomerRole("user")).toBe(true);
    expect(isCustomerRole("admin")).toBe(false);
    expect(isSuperAdminRole("super_admin")).toBe(true);
  });
});

describe("trusted API actor", () => {
  it("only trusts objects created via createTrustedApiActor", () => {
    const forged = {
      trustedApiActor: true,
      actorUserId: "attacker",
      actorRole: "super_admin",
    };
    expect(isTrustedApiActor(forged)).toBe(false);

    const real = createTrustedApiActor({ id: "u1", role: "user" });
    expect(isTrustedApiActor(real)).toBe(true);
    expect(real.actorUserId).toBe("u1");

    // Spreading loses WeakSet identity
    expect(isTrustedApiActor({ ...real })).toBe(false);
  });
});
