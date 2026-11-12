import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  anonymizedContact,
  anonymizedUser,
  appStatusNow,
  deletedEmail,
  deletionRefusal,
  isBlockingBooking,
  DELETED_NAME,
} from "@/lib/account-deletion-rules";
import { mapWalletTxn } from "@/lib/api/wallet-view";

// "Now" = 10 Nov 2026, 12:00 PM Pakistan time.
const NOW = Date.parse("2026-11-10T12:00:00+05:00");
const future = { date: "2026-11-12", startTime: 10, duration: 1 };
const past = { date: "2026-11-08", startTime: 10, duration: 1 };

describe("which bookings block account deletion", () => {
  it("a reserved (unpaid) upcoming booking blocks it", () => {
    expect(isBlockingBooking({ ...future, status: "pending_payment" }, NOW)).toBe(true);
    expect(appStatusNow({ ...future, status: "pending_payment" }, NOW)).toBe("reserved");
  });

  it("a confirmed upcoming booking blocks it", () => {
    expect(isBlockingBooking({ ...future, status: "confirmed" }, NOW)).toBe(true);
  });

  it("a booking happening right now still blocks it", () => {
    expect(isBlockingBooking({ date: "2026-11-10", startTime: 11.5, duration: 1, status: "confirmed" }, NOW)).toBe(true);
  });

  it("completed and cancelled bookings don't block it", () => {
    expect(isBlockingBooking({ ...future, status: "cancelled" }, NOW)).toBe(false);
    expect(isBlockingBooking({ ...past, status: "completed" }, NOW)).toBe(false);
  });

  it("a confirmed booking that has ended counts as completed (as the app shows it)", () => {
    expect(appStatusNow({ ...past, status: "confirmed" }, NOW)).toBe("completed");
    expect(isBlockingBooking({ ...past, status: "confirmed" }, NOW)).toBe(false);
  });

  it("an unpaid booking in the past still blocks it (staff must cancel it)", () => {
    expect(isBlockingBooking({ ...past, status: "pending_payment" }, NOW)).toBe(true);
  });
});

describe("delete decision", () => {
  it("409 ACTIVE_BOOKINGS while any booking is in the way, even if they agree to lose credit", () => {
    const r = deletionRefusal({ blockingCount: 1, walletBalance: 0, forfeitWallet: true });
    expect(r).toMatchObject({ status: 409, code: "ACTIVE_BOOKINGS" });
    expect(r?.message).toMatch(/cancel/);
  });

  it("409 WALLET_NOT_EMPTY when credit is left and forfeitWallet is false", () => {
    const r = deletionRefusal({ blockingCount: 0, walletBalance: 1850, forfeitWallet: false });
    expect(r).toMatchObject({ status: 409, code: "WALLET_NOT_EMPTY" });
    expect(r?.message).toContain("PKR 1,850");
  });

  it("allowed once bookings are done and the customer agrees to lose the credit", () => {
    expect(deletionRefusal({ blockingCount: 0, walletBalance: 1850, forfeitWallet: true })).toBeNull();
  });

  it("allowed with no bookings and an empty wallet", () => {
    expect(deletionRefusal({ blockingCount: 0, walletBalance: 0, forfeitWallet: false })).toBeNull();
  });
});

describe("anonymizing", () => {
  const id = "6af0e7f25977207f24e3d603";
  const at = new Date("2026-11-10T07:00:00Z");

  it("erases personal details and the Google/Apple links, and marks the account deleted", () => {
    const u = anonymizedUser(id, at);
    expect(u.$set).toMatchObject({ name: DELETED_NAME, email: deletedEmail(id), phone: "", image: null, deletedAt: at });
    expect(u.$unset).toEqual({ password: 1, googleId: 1, appleId: 1, preferences: 1 });
  });

  it("the new email is unique and can't receive mail, so the real email can sign up again", () => {
    expect(deletedEmail(id)).toBe(`deleted-${id}@deleted.invalid`);
    expect(deletedEmail(id)).not.toBe(deletedEmail("6af0e7f25977207f24e3d604"));
  });

  it("bookings keep their records under the anonymized customer", () => {
    expect(anonymizedContact(id)).toEqual({ userName: DELETED_NAME, userEmail: deletedEmail(id), userPhone: "deleted" });
  });

  it("the lost wallet credit shows as an 'Account deleted' adjustment", () => {
    expect(
      mapWalletTxn({ _id: { toString: () => "t1" }, type: "debit", amount: 1850, reason: "account_deleted" }, null),
    ).toMatchObject({ type: "adjustment", amount: -1850, title: "Account deleted" });
  });
});

// --- Old tokens: a deleted account's access token gets 401 ---------------------------------
const dbUser = vi.hoisted(() => ({ current: null as Record<string, unknown> | null }));
vi.mock("@/lib/mongodb", () => ({ default: async () => {} }));
vi.mock("@/lib/auth", () => ({ auth: async () => null }));
vi.mock("@/lib/api/mobile-jwt", () => ({
  verifyMobileAccessToken: async (t: string) => (t === "good-token" ? { sub: "u1", email: "a@example.com", name: "A", role: "user" } : null),
}));
vi.mock("@/models/User", () => ({
  default: {
    findById: () => ({ select: async () => dbUser.current }),
  },
}));

describe("old tokens after deletion", () => {
  beforeEach(() => {
    dbUser.current = null;
  });
  const req = () => new Request("http://localhost/api/v1/account/wallet", { headers: { Authorization: "Bearer good-token" } });

  it("a normal customer's token works", async () => {
    const { requireApiCustomer } = await import("@/lib/api/guard");
    dbUser.current = { _id: { toString: () => "u1" }, email: "a@example.com", name: "A", role: "user", deletedAt: null, blockedAt: null };
    const gate = await requireApiCustomer(req());
    expect(gate.ok).toBe(true);
  });

  it("after deletion the same token gets 401", async () => {
    const { requireApiCustomer } = await import("@/lib/api/guard");
    dbUser.current = { _id: { toString: () => "u1" }, email: deletedEmail("u1"), name: DELETED_NAME, role: "user", deletedAt: new Date(), blockedAt: null };
    const gate = await requireApiCustomer(req());
    expect(gate.ok).toBe(false);
    if (!gate.ok) expect(gate.response.status).toBe(401);
  });
});
