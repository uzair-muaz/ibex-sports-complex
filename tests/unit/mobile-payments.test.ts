import { describe, expect, it } from "vitest";
import {
  advanceFor,
  detectFileType,
  parseAmount,
  parseBookingReference,
  signFileLink,
  verifyFileLink,
} from "@/lib/payments/proofs";
import { mobilePaymentStatus } from "@/lib/api/booking-view";
import { resolveAppSettings, validateSettingsPatch } from "@/lib/app-settings";

const SECRET = "test-secret";

describe("payment proof files", () => {
  it("knows the file type from its first bytes, not its name", () => {
    expect(detectFileType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0]))).toBe("jpg");
    expect(detectFileType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]))).toBe("png");
    expect(detectFileType(new TextEncoder().encode("%PDF-1.7 ..."))).toBe("pdf");
    expect(detectFileType(new TextEncoder().encode("<html>"))).toBeNull();
    expect(detectFileType(new Uint8Array([]))).toBeNull();
  });

  it("signed links: right one works, wrong or expired one doesn't", () => {
    const now = Date.parse("2026-11-07T12:00:00Z");
    const exp = now / 1000 + 3600;
    const sig = signFileLink("p1", exp, SECRET);
    expect(verifyFileLink("p1", exp, sig, now, SECRET)).toBe(true);
    expect(verifyFileLink("p2", exp, sig, now, SECRET)).toBe(false);
    expect(verifyFileLink("p1", exp + 1, sig, now, SECRET)).toBe(false);
    expect(verifyFileLink("p1", exp, sig, now + 2 * 3600_000, SECRET)).toBe(false);
    expect(verifyFileLink("p1", exp, "short", now, SECRET)).toBe(false);
  });
});

describe("payment inputs", () => {
  it("amounts", () => {
    expect(parseAmount("3600")).toBe(3600);
    expect(parseAmount(" 3600.4 ")).toBe(3600);
    expect(parseAmount("0")).toBeNull();
    expect(parseAmount("-5")).toBeNull();
    expect(parseAmount("abc")).toBeNull();
    expect(parseAmount(null)).toBeNull();
  });

  it("booking references", () => {
    expect(parseBookingReference("IBX-2109")).toBe(2109);
    expect(parseBookingReference("ibx 2109")).toBe(2109);
    expect(parseBookingReference("2109")).toBe(2109);
    expect(parseBookingReference("IBX-")).toBeNull();
    expect(parseBookingReference("abc")).toBeNull();
  });

  it("advance: stored value, or worked out for old bookings (rounded up)", () => {
    expect(advanceFor({ advanceRequired: 4125, totalPrice: 8250 }, 50)).toBe(4125);
    expect(advanceFor({ totalPrice: 7001 }, 50)).toBe(3501);
  });
});

describe("payment status shown in the app", () => {
  const base = { status: "pending_payment" as const, total: 9000, paid: 0, amountVerified: 0 };
  it("each case", () => {
    expect(mobilePaymentStatus({ ...base, proofs: [] })).toBe("awaiting_proof");
    expect(mobilePaymentStatus({ ...base, proofs: [{ status: "submitted" }] })).toBe("proof_submitted");
    expect(mobilePaymentStatus({ ...base, proofs: [{ status: "rejected" }] })).toBe("rejected");
    expect(mobilePaymentStatus({ ...base, proofs: [{ status: "rejected" }, { status: "submitted" }] })).toBe(
      "proof_submitted",
    );
    expect(
      mobilePaymentStatus({ ...base, status: "confirmed", amountVerified: 4500, paid: 4500, proofs: [{ status: "verified" }] }),
    ).toBe("verified");
    expect(mobilePaymentStatus({ ...base, status: "confirmed", paid: 9000, amountVerified: 9000, proofs: [] })).toBe("paid");
  });
});

describe("bank account settings", () => {
  it("defaults: no bank accounts until the super admin adds them", () => {
    const s = resolveAppSettings(null);
    expect(s.payments.bankAccounts).toEqual([]);
    expect(s.payments.minAdvancePercent).toBe(50);
  });

  it("checks bank accounts", () => {
    const ok = validateSettingsPatch({
      payments: { bankAccounts: [{ bankName: " Meezan ", accountTitle: "IBEX", accountNumber: "0123", iban: "" }] },
    });
    expect(ok).toEqual({
      ok: true,
      value: { payments: { bankAccounts: [{ bankName: "Meezan", accountTitle: "IBEX", accountNumber: "0123", iban: null }] } },
    });
    expect(validateSettingsPatch({ payments: { bankAccounts: [{ bankName: "Meezan" }] } }).ok).toBe(false);
    expect(validateSettingsPatch({ payments: { transferNote: "" } }).ok).toBe(false);
  });

  it("the balance note has a default and is edited like the other notes", () => {
    expect(resolveAppSettings(null).payments.balanceNote).toBe("Pay the remaining balance at the venue.");
    expect(resolveAppSettings({ payments: { balanceNote: "Pay the rest at reception." } }).payments.balanceNote).toBe(
      "Pay the rest at reception.",
    );
    expect(validateSettingsPatch({ payments: { balanceNote: " Pay at reception. " } })).toEqual({
      ok: true,
      value: { payments: { balanceNote: "Pay at reception." } },
    });
    expect(validateSettingsPatch({ payments: { balanceNote: " " } }).ok).toBe(false);
  });
});
