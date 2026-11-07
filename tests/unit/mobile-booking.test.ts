import { describe, expect, it } from "vitest";
import { bookingCoversCell, cellsFor } from "@/lib/booking-locks";
import { bookingReference, bookingStartMs, mobileStatus, toMobileBooking } from "@/lib/api/booking-view";
import { hashToken, newGuestAccessToken, requestHash, validateGuest } from "@/lib/api/create-app-booking";
import { dayIndex } from "@/lib/booking-overlap";
import { decodeCursor, encodeCursor, isUpcomingBooking, splitBookings } from "@/lib/api/my-bookings";

const ctx = { cancellationNoticeMinutes: 240, minAdvancePercent: 50 };

const base = {
  _id: "6650c0ffee0000000000b001",
  serialNumber: 8821,
  courtId: { _id: "6650c0ffee0000000000c001", name: "Padel Court 1", type: "PADEL" },
  date: "2026-11-20",
  startTime: 18,
  duration: 1.5,
  status: "pending_payment" as const,
  userId: "6650c0ffee0000000000a001",
  originalPrice: 9000,
  discountAmount: 0,
  loyaltyPointsRedeemed: 0,
  loyaltyDiscountPkr: 0,
  totalPrice: 9000,
  amountPaid: 0,
  advanceRequired: 4500,
  createdAt: new Date("2026-11-07T10:00:00Z"),
};

describe("slot locks: half-hour cells", () => {
  it("one cell per half hour", () => {
    const first = dayIndex("2026-11-20") * 48 + 36;
    expect(cellsFor("2026-11-20", 18, 1.5)).toEqual([first, first + 1, first + 2]);
  });

  it("crossing midnight continues into the next day", () => {
    const cells = cellsFor("2026-11-20", 23, 2);
    const nextDayFirst = dayIndex("2026-11-21") * 48;
    expect(cells).toEqual([nextDayFirst - 2, nextDayFirst - 1, nextDayFirst, nextDayFirst + 1]);
    // A booking at 00:30 the next day shares a cell.
    expect(cellsFor("2026-11-21", 0.5, 1)).toContain(nextDayFirst + 1);
  });

  it("bookingCoversCell", () => {
    const b = { date: "2026-11-20", startTime: 18, duration: 1 };
    const [c1, c2] = cellsFor("2026-11-20", 18, 1);
    expect(bookingCoversCell(b, c1)).toBe(true);
    expect(bookingCoversCell(b, c2)).toBe(true);
    expect(bookingCoversCell(b, c2 + 1)).toBe(false);
    // Moved booking no longer covers the old cell.
    expect(bookingCoversCell({ ...b, startTime: 20 }, c1)).toBe(false);
  });
});

describe("booking view (what the app sees)", () => {
  it("reserved booking awaiting proof", () => {
    const v = toMobileBooking(base, { ...ctx, now: Date.parse("2026-11-07T10:00:00Z") });
    expect(v).toMatchObject({
      id: "6650c0ffee0000000000b001",
      reference: "IBX-8821",
      courtId: "6650c0ffee0000000000c001",
      courtName: "Padel Court 1",
      sport: "PADEL",
      start: "2026-11-20T18:00:00+05:00",
      durationMinutes: 90,
      status: "reserved",
      price: { courtFee: 9000, pointsUsed: 0, pointsDiscount: 0, total: 9000 },
      payment: { status: "awaiting_proof", advanceRequired: 4500, amountVerified: 0, balanceDue: 9000, proofs: [] },
      cancellation: { canCancel: true, cancelUntil: "2026-11-20T14:00:00+05:00" },
      refund: null,
      hoursUsed: 0,
    });
  });

  it("points discount and confirmed status", () => {
    const v = toMobileBooking(
      { ...base, status: "confirmed", loyaltyPointsRedeemed: 1000, loyaltyDiscountPkr: 1000, totalPrice: 8000 },
      ctx,
    );
    expect(v.status).toBe("confirmed");
    expect(v.price).toEqual({ courtFee: 9000, pointsUsed: 1000, pointsDiscount: 1000, total: 8000 });
    expect(v.payment.status).toBe("verified");
  });

  it("fully paid shows paid", () => {
    const v = toMobileBooking({ ...base, status: "confirmed", amountPaid: 9000 }, ctx);
    expect(v.payment.status).toBe("paid");
    expect(v.payment.balanceDue).toBe(0);
  });

  it("guests can't cancel in the app; too late can't cancel either", () => {
    expect(toMobileBooking({ ...base, userId: null }, { ...ctx, now: 0 }).cancellation.canCancel).toBe(false);
    const late = Date.parse("2026-11-20T09:30:00Z"); // 14:30 venue time
    expect(toMobileBooking(base, { ...ctx, now: late }).cancellation.canCancel).toBe(false);
  });

  it("old web bookings: advance worked out from settings, reference from id", () => {
    const v = toMobileBooking({ ...base, serialNumber: undefined, advanceRequired: undefined, totalPrice: 7001 }, ctx);
    expect(v.payment.advanceRequired).toBe(3501);
    expect(v.reference).toBe("IBX-00B001");
  });

  it("helpers", () => {
    expect(mobileStatus("pending_payment")).toBe("reserved");
    expect(mobileStatus("cancelled")).toBe("cancelled");
    expect(bookingReference({ _id: "x", serialNumber: 5 })).toBe("IBX-5");
    expect(new Date(bookingStartMs("2026-11-20", 18)).toISOString()).toBe("2026-11-20T13:00:00.000Z");
  });
});

describe("app booking input", () => {
  it("guest details are checked and phone is normalised", () => {
    const ok = validateGuest({ name: " Ali Raza ", email: "ALI@Example.com", phone: "0300 1234567" });
    expect(ok).toEqual({
      ok: true,
      contact: { userId: null, name: "Ali Raza", email: "ali@example.com", phone: "+923001234567" },
    });
    expect(validateGuest(null)).toMatchObject({ ok: false, code: "VALIDATION_ERROR" });
    expect(validateGuest({ name: "Ali", email: "nope", phone: "03001234567" })).toMatchObject({ ok: false });
    expect(validateGuest({ name: "Ali", email: "a@b.co", phone: "12345" })).toMatchObject({
      ok: false,
      code: "INVALID_PHONE",
    });
  });

  it("guest tokens are random and only the hash is stored", () => {
    const a = newGuestAccessToken();
    const b = newGuestAccessToken();
    expect(a).toMatch(/^gt_[A-Za-z0-9_-]{32}$/);
    expect(a).not.toBe(b);
    expect(hashToken(a)).toHaveLength(64);
    expect(hashToken(a)).not.toContain(a);
  });

  it("request hash: same request same hash, different request different hash", () => {
    const body = { courtId: "c1", start: "2026-11-20T18:00:00+05:00", durationMinutes: 90, usePoints: true };
    expect(requestHash(body)).toBe(requestHash({ ...body }));
    expect(requestHash(body)).not.toBe(requestHash({ ...body, durationMinutes: 60 }));
    expect(requestHash(body)).not.toBe(requestHash({ ...body, usePoints: false }));
  });
});

describe("my bookings (app)", () => {
  const now = Date.parse("2026-11-07T13:00:00Z"); // 18:00 venue time
  const mk = (date: string, startTime: number, status: "pending_payment" | "confirmed" | "cancelled" | "completed", duration = 1) => ({
    date,
    startTime,
    duration,
    status,
  });

  it("upcoming = reserved or confirmed and not finished", () => {
    expect(isUpcomingBooking(mk("2026-11-07", 17.5, "confirmed"), now)).toBe(true); // still playing
    expect(isUpcomingBooking(mk("2026-11-07", 16, "confirmed"), now)).toBe(false); // ended 17:00
    expect(isUpcomingBooking(mk("2026-11-08", 10, "pending_payment"), now)).toBe(true);
    expect(isUpcomingBooking(mk("2026-11-08", 10, "cancelled"), now)).toBe(false);
  });

  it("upcoming soonest first, past newest first", () => {
    const a = mk("2026-11-10", 18, "confirmed");
    const b = mk("2026-11-08", 9, "pending_payment");
    const c = mk("2026-11-01", 18, "completed");
    const d = mk("2026-11-05", 18, "cancelled");
    const { upcoming, past } = splitBookings([a, b, c, d], now);
    expect(upcoming).toEqual([b, a]);
    expect(past).toEqual([d, c]);
  });

  it("cursor round trip; junk cursor rejected", () => {
    expect(decodeCursor(encodeCursor(40))).toBe(40);
    expect(decodeCursor(null)).toBe(0);
    expect(decodeCursor("hello")).toBeNull();
  });

  it("confirmed booking in the past shows as completed", () => {
    const v = toMobileBooking({ ...base, status: "confirmed" }, { ...ctx, now: Date.parse("2026-12-01T00:00:00Z") });
    expect(v.status).toBe("completed");
    expect(v.cancellation.canCancel).toBe(false);
  });
});
