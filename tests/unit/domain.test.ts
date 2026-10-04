import { describe, expect, it } from "vitest";
import {
  LOYALTY_MIN_REDEEM_POINTS,
  maxRedeemablePoints,
  pointsForDuration,
  pkrFromPoints,
} from "@/lib/loyalty-rules";
import {
  canUseMembershipForSlot,
  customerCanCancelBooking,
  isWeekendDateKey,
  membershipAdvanceHoursRequired,
} from "@/lib/membership-rules";
import {
  isCustomerRole,
  isStaffRole,
  isSuperAdminRole,
} from "@/lib/authz";
import {
  createTrustedApiActor,
  isTrustedApiActor,
} from "@/lib/trusted-api-actor";

describe("loyalty-rules", () => {
  it("awards 10 points per hour", () => {
    expect(pointsForDuration(1)).toBe(10);
    expect(pointsForDuration(1.5)).toBe(15);
  });

  it("converts points to PKR 1:1", () => {
    expect(pkrFromPoints(100)).toBe(100);
  });

  it("enforces min redeem and 50% cap", () => {
    expect(maxRedeemablePoints(50, 10_000)).toBe(0);
    expect(maxRedeemablePoints(LOYALTY_MIN_REDEEM_POINTS, 10_000)).toBe(100);
    expect(maxRedeemablePoints(10_000, 1_000)).toBe(500);
  });
});

describe("membership-rules", () => {
  it("detects weekends", () => {
    expect(isWeekendDateKey("2026-08-08")).toBe(true); // Sat
    expect(isWeekendDateKey("2026-08-09")).toBe(true); // Sun
    expect(isWeekendDateKey("2026-08-10")).toBe(false); // Mon
  });

  it("requires more advance notice on weekends", () => {
    expect(membershipAdvanceHoursRequired("2026-08-10")).toBe(2);
    expect(membershipAdvanceHoursRequired("2026-08-08")).toBe(24);
  });

  it("blocks weekday-only membership on Saturday", () => {
    const result = canUseMembershipForSlot({
      weekdayOnly: true,
      date: "2026-08-08",
      startTime: 18,
      now: new Date(2026, 7, 1, 12, 0, 0),
    });
    expect(result.ok).toBe(false);
  });

  it("allows cancel when far enough before start", () => {
    const now = new Date(2026, 7, 10, 10, 0, 0);
    expect(
      customerCanCancelBooking({
        status: "confirmed",
        date: "2026-08-10",
        startTime: 18,
        now,
      }),
    ).toBe(true);
    expect(
      customerCanCancelBooking({
        status: "confirmed",
        date: "2026-08-10",
        startTime: 12,
        now,
      }),
    ).toBe(false);
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
