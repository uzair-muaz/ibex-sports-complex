import { describe, expect, it } from "vitest";
import { advanceFor, canUploadProof, noticeText, webBookingReference } from "@/lib/web-booking-labels";

describe("web booking labels", () => {
  it("makes the same reference as the app", () => {
    expect(webBookingReference({ _id: "6af79c6caea9d27b6fe21140", serialNumber: 8821 })).toBe("IBX-8821");
    expect(webBookingReference({ _id: "6af79c6caea9d27b6fe21140" })).toBe("IBX-E21140");
  });

  it("rounds the advance up", () => {
    expect(advanceFor(5250, 50)).toBe(2625);
    expect(advanceFor(5251, 50)).toBe(2626);
    expect(advanceFor(0, 50)).toBe(0);
  });

  it("writes the cancel notice in plain words", () => {
    expect(noticeText(240)).toBe("4 hours");
    expect(noticeText(60)).toBe("1 hour");
    expect(noticeText(90)).toBe("1 hour 30 minutes");
    expect(noticeText(30)).toBe("30 minutes");
  });

  it("only lets an active booking with money owed upload", () => {
    const b = (status: "reserved" | "cancelled", pay: "awaiting_proof" | "proof_submitted" | "rejected" | "verified", due: number) => ({
      status,
      payment: { status: pay, balanceDue: due },
    });
    expect(canUploadProof(b("reserved", "awaiting_proof", 2625))).toBe(true);
    expect(canUploadProof(b("reserved", "rejected", 2625))).toBe(true);
    expect(canUploadProof(b("reserved", "proof_submitted", 2625))).toBe(false);
    expect(canUploadProof(b("cancelled", "awaiting_proof", 2625))).toBe(false);
    expect(canUploadProof(b("reserved", "verified", 0))).toBe(false);
  });
});
