/**
 * Account deletion (customer, in the app). Pure rules, safe for tests.
 *
 * - Bookings that aren't completed or cancelled block deletion.
 *   A confirmed booking whose time has passed counts as completed (same as the app shows it).
 * - Unused wallet credit doesn't block it, but the customer must agree to lose it.
 */
import { bookingStartMs, mobileStatus, type MobileBookingStatus } from "@/lib/api/booking-view";

export const DELETED_NAME = "Deleted customer";
export const DELETED_PHONE = "deleted";

export const ACTIVE_BOOKINGS_CODE = "ACTIVE_BOOKINGS";
export const WALLET_NOT_EMPTY_CODE = "WALLET_NOT_EMPTY";

export const ACTIVE_BOOKINGS_MESSAGE =
  "You have upcoming bookings. Please play or cancel them first, then you can delete your account.";

export function walletNotEmptyMessage(balance: number): string {
  return `You still have PKR ${Math.round(balance).toLocaleString("en-US")} in your IBEX wallet. Use it on a booking, or choose to lose it and delete your account.`;
}

/** A unique address nobody can receive mail at, so the real email can sign up again. */
export function deletedEmail(userId: string): string {
  return `deleted-${userId}@deleted.invalid`;
}

export type DeletionBookingRow = {
  _id: { toString(): string };
  serialNumber?: number | null;
  courtId: { toString(): string };
  date: string;
  startTime: number;
  duration: number;
  status: "pending_payment" | "confirmed" | "cancelled" | "completed";
};

export type BlockingBooking = {
  id: string;
  reference: string;
  courtName: string;
  start: string;
  status: MobileBookingStatus;
};

/** The status the app shows (a confirmed booking that has ended shows as completed). */
export function appStatusNow(b: Pick<DeletionBookingRow, "status" | "date" | "startTime" | "duration">, now: number): MobileBookingStatus {
  if (b.status === "confirmed" && now >= bookingStartMs(b.date, b.startTime) + b.duration * 3_600_000) {
    return "completed";
  }
  return mobileStatus(b.status);
}

export function isBlockingBooking(b: Pick<DeletionBookingRow, "status" | "date" | "startTime" | "duration">, now: number): boolean {
  const s = appStatusNow(b, now);
  return s !== "completed" && s !== "cancelled";
}

export type DeletionRefusal = { status: 409; code: typeof ACTIVE_BOOKINGS_CODE | typeof WALLET_NOT_EMPTY_CODE; message: string };

/** null = the account may be deleted now. */
export function deletionRefusal(p: { blockingCount: number; walletBalance: number; forfeitWallet: boolean }): DeletionRefusal | null {
  if (p.blockingCount > 0) return { status: 409, code: ACTIVE_BOOKINGS_CODE, message: ACTIVE_BOOKINGS_MESSAGE };
  if (p.walletBalance > 0 && !p.forfeitWallet) {
    return { status: 409, code: WALLET_NOT_EMPTY_CODE, message: walletNotEmptyMessage(p.walletBalance) };
  }
  return null;
}

/** What the user record becomes. Booking and payment records stay, under this name. */
export function anonymizedUser(userId: string, now: Date) {
  return {
    $set: {
      name: DELETED_NAME,
      email: deletedEmail(userId),
      phone: "",
      image: null,
      dateOfBirth: null,
      gender: null,
      city: null,
      emailVerified: null,
      passwordResetTokenHash: null,
      passwordResetExpires: null,
      deletedAt: now,
    },
    $unset: { password: 1, googleId: 1, appleId: 1, preferences: 1 },
  };
}

/** The customer's details copied onto their bookings and feedback. */
export function anonymizedContact(userId: string) {
  return { userName: DELETED_NAME, userEmail: deletedEmail(userId), userPhone: DELETED_PHONE };
}
