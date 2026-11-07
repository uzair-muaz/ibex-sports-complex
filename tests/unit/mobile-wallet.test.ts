import { describe, expect, it } from "vitest";
import { mapWalletTxn } from "@/lib/api/wallet-view";
import { staffWalletChange } from "@/lib/wallet-admin";
import { computeQuote } from "@/lib/pricing/quote";
import { DEFAULT_APP_SETTINGS } from "@/lib/app-settings";

const id = { toString: () => "t1" };
const booking = { toString: () => "b1" };
const at = new Date("2026-11-07T10:00:00Z");

describe("wallet history items", () => {
  it("refunds are money in, with the booking reference", () => {
    expect(
      mapWalletTxn({ _id: id, type: "credit", amount: 2250, reason: "booking_refund", bookingId: booking, createdAt: at }, "IBX-2109"),
    ).toEqual({ id: "t1", type: "refund", amount: 2250, title: "Refund · IBX-2109", bookingId: "b1", date: "2026-11-07T15:00:00+05:00" });
  });

  it("paying for a booking is money out", () => {
    const item = mapWalletTxn({ _id: id, type: "debit", amount: 900, reason: "booking_payment", bookingId: booking }, "IBX-7");
    expect(item.type).toBe("spent");
    expect(item.amount).toBe(-900);
    expect(item.title).toBe("Used for IBX-7");
  });

  it("bank payouts and staff changes are adjustments", () => {
    expect(mapWalletTxn({ _id: id, type: "debit", amount: 500, reason: "bank_payout" }, null)).toMatchObject({
      type: "adjustment",
      amount: -500,
      title: "Paid out to your bank",
    });
    expect(mapWalletTxn({ _id: id, type: "credit", amount: 300, reason: "admin_adjustment", note: "Goodwill" }, null)).toMatchObject({
      type: "adjustment",
      amount: 300,
    });
  });
});

describe("staff wallet change checks (before touching the database)", () => {
  const ok = { userId: "6aef081351e124b88178c99a", action: "credit", amount: 500, note: "Goodwill", requestId: "abcd-1234-efgh", staffId: "s" };
  it.each([
    [{ action: "steal" }, "action must be"],
    [{ amount: 0 }, "amount"],
    [{ amount: "500" }, "amount"],
    [{ note: "" }, "reason"],
    [{ requestId: "x" }, "requestId"],
  ])("refuses %o", async (patch, words) => {
    const res = await staffWalletChange({ ...ok, ...patch });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.status).toBe(400);
      expect(res.error).toContain(words);
    }
  });

  it("refuses a bad customer id", async () => {
    const res = await staffWalletChange({ ...ok, userId: "nope" });
    expect(res).toMatchObject({ ok: false, status: 404, code: "USER_NOT_FOUND" });
  });
});

describe("quote with wallet", () => {
  const base = {
    originalCourtFee: 6000,
    courtFee: 6000,
    durationMinutes: 60,
    usePoints: false,
    loyalty: DEFAULT_APP_SETTINGS.loyalty,
    minAdvancePercent: 50,
  };
  it("wallet covering the advance means nothing to transfer", () => {
    const q = computeQuote({ ...base, customer: { pointsBalance: 0, walletBalance: 3500 }, useWallet: true });
    expect(q.wallet).toEqual({ available: 3500, used: 3500 });
    expect(q.toTransfer).toBe(0);
  });
  it("wallet is not used unless asked", () => {
    const q = computeQuote({ ...base, customer: { pointsBalance: 0, walletBalance: 3500 }, useWallet: false });
    expect(q.wallet).toEqual({ available: 3500, used: 0 });
    expect(q.toTransfer).toBe(3000);
  });
  it("never uses more than the price", () => {
    const q = computeQuote({ ...base, customer: { pointsBalance: 0, walletBalance: 99999 }, useWallet: true });
    expect(q.wallet?.used).toBe(6000);
  });
});
