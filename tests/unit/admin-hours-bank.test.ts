import { describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { cleanHoursDelta, mergeHoursHistory } from "@/lib/membership-admin";
import { cleanMembershipPayment } from "@/lib/membership-payment";
import { getOpenApiDocument } from "@/lib/api/openapi";

const id = () => new mongoose.Types.ObjectId();

describe("hours bank: hours to add or remove", () => {
  it("allows whole and half hours, + or −", () => {
    expect(cleanHoursDelta(2)).toBe(2);
    expect(cleanHoursDelta(-1.5)).toBe(-1.5);
  });
  it("refuses 0, odd minutes, huge numbers and text", () => {
    for (const v of [0, 1.25, 0.1, 501, -501, "2", null, NaN]) expect(cleanHoursDelta(v)).toBeNull();
  });
});

describe("membership payment", () => {
  it("not recorded is fine", () => {
    expect(cleanMembershipPayment(undefined)).toBeNull();
    expect(cleanMembershipPayment(null)).toBeNull();
  });
  it("cash needs a whole PKR amount above 0", () => {
    expect(cleanMembershipPayment({ method: "cash", pricePaid: 25000, note: " receipt 12 " })).toEqual({ method: "cash", pricePaid: 25000, note: "receipt 12" });
    expect(cleanMembershipPayment({ method: "cash", pricePaid: 0 })).toBe("invalid");
    expect(cleanMembershipPayment({ method: "cash", pricePaid: 99.5 })).toBe("invalid");
    expect(cleanMembershipPayment({ method: "cash" })).toBe("invalid");
  });
  it("free is always PKR 0; unknown methods are refused", () => {
    expect(cleanMembershipPayment({ method: "free", pricePaid: 5000 })).toEqual({ method: "free", pricePaid: 0 });
    expect(cleanMembershipPayment({ method: "crypto", pricePaid: 100 })).toBe("invalid");
  });
});

describe("hours history", () => {
  it("mixes staff changes with bookings, newest first", () => {
    const bookingId = id();
    const items = mergeHoursHistory(
      [
        { _id: id(), type: "activated", sport: "PADEL", hours: 10, remainingAfter: 10, note: "Gold", byUserId: { name: "Desk" }, createdAt: new Date("2026-11-01T10:00:00+05:00") },
        { _id: id(), type: "added", sport: "PADEL", hours: 2, remainingAfter: 10.5, note: "Rain", byUserId: { name: "Boss" }, createdAt: new Date("2026-11-04T10:00:00+05:00") },
      ],
      [
        {
          _id: bookingId,
          serialNumber: 8821,
          date: "2026-11-05",
          startTime: 19.5,
          duration: 1.5,
          membershipHoursUsed: 1.5,
          membershipSport: "PADEL",
          membershipHoursReturnedAt: new Date("2026-11-05T12:00:00+05:00"),
          createdAt: new Date("2026-11-02T10:00:00+05:00"),
        },
      ],
    );
    expect(items.map((i) => i.type)).toEqual(["returned", "added", "used", "activated"]);
    expect(items[0]).toMatchObject({ hours: 1.5, bookingRef: "IBX-8821", note: "Booking 2026-11-05 at 19:30 cancelled", bookingId: bookingId.toString() });
    expect(items[2]).toMatchObject({ hours: -1.5, by: null });
    expect(items[1]).toMatchObject({ hours: 2, by: "Boss", remainingAfter: 10.5 });
    expect(items.every((i) => !("at" in i))).toBe(true);
  });
});

describe("hours bank docs", () => {
  it("lists both admin routes", () => {
    const paths = (getOpenApiDocument() as { paths: Record<string, unknown> }).paths;
    expect(paths["/api/v1/admin/memberships"]).toBeDefined();
    expect(paths["/api/v1/admin/memberships/{id}"]).toBeDefined();
  });
});
