/**
 * Plain words for the website's My Bookings pages. Same meanings as the app
 * (lib/api/booking-view.ts). Browser-safe: no database imports.
 */

export type WebBookingStatus = "reserved" | "confirmed" | "completed" | "cancelled";
export type WebPaymentStatus = "awaiting_proof" | "proof_submitted" | "verified" | "rejected" | "paid";
export type Tone = "amber" | "green" | "zinc" | "red" | "blue";

export const BOOKING_STATUS_LABEL: Record<WebBookingStatus, { label: string; tone: Tone }> = {
  reserved: { label: "Reserved, waiting for advance", tone: "amber" },
  confirmed: { label: "Confirmed", tone: "green" },
  completed: { label: "Completed", tone: "zinc" },
  cancelled: { label: "Cancelled", tone: "red" },
};

export const PAYMENT_STATUS_LABEL: Record<WebPaymentStatus, { label: string; hint: string; tone: Tone }> = {
  awaiting_proof: {
    label: "Waiting for your payment",
    hint: "Send the advance by bank transfer, then upload the screenshot below.",
    tone: "amber",
  },
  proof_submitted: {
    label: "Screenshot under review",
    hint: "Our team is checking your payment. Your booking is confirmed once it is verified.",
    tone: "blue",
  },
  verified: {
    label: "Advance verified",
    hint: "Pay the rest at the venue.",
    tone: "green",
  },
  rejected: {
    label: "Screenshot not accepted",
    hint: "Please check the reason below and upload a new screenshot.",
    tone: "red",
  },
  paid: { label: "Fully paid", hint: "Nothing left to pay.", tone: "green" },
};

/** "IBX-8821"; bookings without a serial number use the end of the id (same as the app). */
export function webBookingReference(b: { _id: string; serialNumber?: number | null }): string {
  if (b.serialNumber) return `IBX-${b.serialNumber}`;
  return `IBX-${b._id.slice(-6).toUpperCase()}`;
}

/** The advance to send: advancePercent of the total, rounded up (same as the server). */
export function advanceFor(total: number, advancePercent: number): number {
  return Math.ceil((Math.max(0, total) * advancePercent) / 100);
}

/** 240 → "4 hours", 90 → "1 hour 30 minutes", 30 → "30 minutes". */
export function noticeText(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const hours = h === 0 ? "" : `${h} hour${h === 1 ? "" : "s"}`;
  const mins = m === 0 ? "" : `${m} minute${m === 1 ? "" : "s"}`;
  return [hours, mins].filter(Boolean).join(" ") || "0 minutes";
}

/** Customer can upload a screenshot while nothing is verified yet and money is still owed. */
export function canUploadProof(b: { status: WebBookingStatus; payment: { status: WebPaymentStatus; balanceDue: number } }): boolean {
  if (b.status === "cancelled" || b.status === "completed") return false;
  // Verified: the rest is paid at the venue (same as the app).
  if (b.payment.status !== "awaiting_proof" && b.payment.status !== "rejected") return false;
  return b.payment.balanceDue > 0;
}
