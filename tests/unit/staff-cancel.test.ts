import { describe, expect, it } from "vitest";
import { defaultRefundChoice, staffRefundPlan } from "@/lib/staff-refund-plan";
import fs from "fs";

const booking = { amountPaid: 3000, walletCreditUsed: 500, userId: "u1" };

describe("staff cancel: what goes back", () => {
  it("wallet: money paid and wallet credit both go to the wallet", () => {
    expect(staffRefundPlan(booking, "wallet")).toEqual({ toWallet: 3500, paidBack: 0, returnPointsAndHours: true });
  });
  it("paid back by cash or bank: only the wallet credit goes to the wallet", () => {
    expect(staffRefundPlan(booking, "paid_back")).toEqual({ toWallet: 500, paidBack: 3000, returnPointsAndHours: true });
  });
  it("keep: nothing goes back, not even points or hours", () => {
    expect(staffRefundPlan(booking, "none")).toEqual({ toWallet: 0, paidBack: 0, returnPointsAndHours: false });
  });
  it("nothing paid: nothing to give back", () => {
    expect(staffRefundPlan({ amountPaid: 0 }, "wallet").toWallet).toBe(0);
  });
  it("defaults: wallet for customers, cash/bank for guests", () => {
    expect(defaultRefundChoice(booking)).toBe("wallet");
    expect(defaultRefundChoice({ amountPaid: 3000, userId: null })).toBe("paid_back");
  });
});

describe("staff-only money rules", () => {
  it("only the super admin can create, change, delete or switch discounts", () => {
    const src = fs.readFileSync("app/actions/discounts.ts", "utf8");
    for (const fn of ["createDiscount", "updateDiscount", "deleteDiscount", "toggleDiscountActive"]) {
      const body = src.slice(src.indexOf(`export async function ${fn}(`)).slice(0, 400);
      expect(body, fn).toContain("requireStaffActor(opts, { superAdmin: true })");
    }
  });
  it("no page or email says advance payments are non-refundable", () => {
    for (const f of ["app/booking/BookingClient.tsx", "lib/email-templates/booking-confirmation.ts"]) {
      expect(fs.readFileSync(f, "utf8")).not.toMatch(/non-refundable/i);
    }
  });
});
