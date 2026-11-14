import { describe, expect, it } from "vitest";
import { checkVenuePayment, stillToPay } from "@/lib/venue-payments-rules";

const booking = { status: "confirmed", totalPrice: 5250, amountPaid: 2000, walletCreditUsed: 0 };

describe("record payment", () => {
  it("works out what is still to pay", () => {
    expect(stillToPay(booking)).toBe(3250);
    expect(stillToPay({ ...booking, walletCreditUsed: 250 })).toBe(3000);
    expect(stillToPay({ ...booking, amountPaid: 6000 })).toBe(0);
    expect(stillToPay({ status: "confirmed", totalPrice: 4000 })).toBe(4000);
  });

  it("accepts the rest in cash, or part of it by bank", () => {
    expect(checkVenuePayment(booking, { amount: 3250, method: "cash" })).toEqual({
      ok: true,
      value: { amount: 3250, method: "cash", note: null },
    });
    const part = checkVenuePayment(booking, { amount: "1000", method: "bank", note: "  JazzCash  " });
    expect(part).toEqual({ ok: true, value: { amount: 1000, method: "bank", note: "JazzCash" } });
  });

  it("refuses too much, bad input, paid or cancelled bookings", () => {
    const err = (r: ReturnType<typeof checkVenuePayment>) => (r.ok ? "" : r.error);
    expect(err(checkVenuePayment(booking, { amount: 4000, method: "cash" }))).toContain("PKR 3,250 still to pay");
    expect(err(checkVenuePayment(booking, { amount: 0, method: "cash" }))).toContain("Enter the amount");
    expect(err(checkVenuePayment(booking, { amount: 100, method: "card" }))).toContain("cash or bank");
    expect(err(checkVenuePayment({ ...booking, amountPaid: 5250 }, { amount: 1, method: "cash" }))).toContain("fully paid");
    expect(err(checkVenuePayment({ ...booking, status: "cancelled" }, { amount: 1, method: "cash" }))).toContain("cancelled");
  });
});
