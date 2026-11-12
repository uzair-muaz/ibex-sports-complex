import { describe, expect, it } from "vitest";
import { cancellationPreview } from "@/lib/api/app-cancel";
import { toMobileBooking } from "@/lib/api/booking-view";

// Booking 2026-11-20 18:00 venue time = 13:00 UTC. Notice 240 min → cancel until 14:00 venue time.
const b = {
  status: "pending_payment" as const,
  date: "2026-11-20",
  startTime: 18,
  duration: 1.5,
  amountPaid: 0,
  walletCreditUsed: 0,
  loyaltyPointsRedeemed: 0,
};
const at = (iso: string) => Date.parse(iso);

describe("cancel preview", () => {
  it("in time, nothing paid", () => {
    expect(cancellationPreview(b, 240, at("2026-11-20T08:00:00Z"))).toEqual({
      canCancel: true,
      cancelUntil: "2026-11-20T14:00:00+05:00",
      refundAmount: 0,
      refundTo: null,
      pointsReturned: 0,
      hoursReturned: 0,
      reasonCode: null,
    });
  });

  it("verified money + wallet used go to the wallet; points and hours come back", () => {
    const p = cancellationPreview(
      {
        ...b,
        status: "confirmed",
        amountPaid: 3575,
        walletCreditUsed: 2000,
        loyaltyPointsRedeemed: 1850,
        usedMembershipHours: true,
        membershipHoursUsed: 1.5,
      },
      240,
      at("2026-11-19T00:00:00Z"),
    );
    expect(p).toMatchObject({ canCancel: true, refundAmount: 5575, refundTo: "wallet", pointsReturned: 1850, hoursReturned: 1.5 });
  });

  it("too late, started, already cancelled, completed", () => {
    expect(cancellationPreview(b, 240, at("2026-11-20T09:00:00Z")).reasonCode).toBe("CANCEL_WINDOW_PASSED"); // 14:00 exactly
    expect(cancellationPreview(b, 240, at("2026-11-20T13:00:00Z")).reasonCode).toBe("ALREADY_STARTED");
    expect(cancellationPreview({ ...b, status: "cancelled" }, 240, 0).reasonCode).toBe("ALREADY_CANCELLED");
    expect(cancellationPreview({ ...b, status: "completed" }, 240, 0).reasonCode).toBe("NOT_CANCELLABLE");
  });

  it("follows the notice setting", () => {
    // 3 hours before start: blocked with 240 min, allowed with 120 min.
    const now = at("2026-11-20T10:00:00Z");
    expect(cancellationPreview(b, 240, now).canCancel).toBe(false);
    expect(cancellationPreview(b, 120, now).canCancel).toBe(true);
  });
});

describe("booking view after cancel", () => {
  const base = {
    _id: "6650c0ffee0000000000b001",
    serialNumber: 1,
    courtId: "c1",
    date: "2026-11-20",
    startTime: 18,
    duration: 1.5,
    userId: "u1",
    originalPrice: 9000,
    totalPrice: 9000,
  };
  const ctx = { cancellationNoticeMinutes: 240, minAdvancePercent: 50 };
  it("shows the refund", () => {
    const v = toMobileBooking({ ...base, status: "cancelled", refundAmount: 4500, refundTo: "wallet" }, ctx);
    expect(v.status).toBe("cancelled");
    expect(v.refund).toEqual({ amount: 4500, to: "wallet" });
    expect(v.cancellation.canCancel).toBe(false);
  });
  it("no refund when nothing was paid", () => {
    expect(toMobileBooking({ ...base, status: "cancelled", refundAmount: 0 }, ctx).refund).toBeNull();
    expect(toMobileBooking({ ...base, status: "confirmed", refundAmount: 100 }, ctx).refund).toBeNull();
  });
});
