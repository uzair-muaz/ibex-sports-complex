import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Booking from "@/models/Booking";
import { getAppSettings } from "@/lib/app-settings";
import { proofsByBooking } from "@/lib/payments/proofs";
import { bookingStartMs, toMobileBooking, type BookingSource, type MobileBooking } from "@/lib/api/booking-view";

export const PAST_PAGE_DEFAULT = 20;
export const PAST_PAGE_MAX = 50;

type Span = Pick<BookingSource, "date" | "startTime" | "duration" | "status">;

/** Reserved or confirmed and not finished yet. */
export function isUpcomingBooking(b: Span, now: number): boolean {
  if (b.status !== "pending_payment" && b.status !== "confirmed") return false;
  return bookingStartMs(b.date, b.startTime) + b.duration * 3_600_000 > now;
}

/** "Next page" marker: just the position, so the app can't do anything else with it. */
export function encodeCursor(offset: number): string {
  return Buffer.from(`o:${offset}`).toString("base64url");
}

export function decodeCursor(cursor: string | null | undefined): number | null {
  if (!cursor) return 0;
  const m = Buffer.from(cursor, "base64url").toString().match(/^o:(\d{1,6})$/);
  return m ? Number(m[1]) : null;
}

/** Split and order: upcoming soonest first, past newest first. */
export function splitBookings<T extends Span>(bookings: T[], now: number) {
  const key = (b: T) => bookingStartMs(b.date, b.startTime);
  const upcoming = bookings.filter((b) => isUpcomingBooking(b, now)).sort((a, b) => key(a) - key(b));
  const past = bookings.filter((b) => !isUpcomingBooking(b, now)).sort((a, b) => key(b) - key(a));
  return { upcoming, past };
}

async function viewContext() {
  const settings = await getAppSettings();
  return {
    cancellationNoticeMinutes: settings.cancellationNoticeMinutes,
    minAdvancePercent: settings.payments.minAdvancePercent,
  };
}

/**
 * The app's Bookings tab: all upcoming, past in pages.
 * Returns null when the cursor is not one we gave out.
 */
export async function listMyAppBookings(params: {
  userId: string;
  cursor?: string | null;
  limit?: number;
}): Promise<{ upcoming: MobileBooking[]; past: { items: MobileBooking[]; nextCursor: string | null } } | null> {
  const offset = decodeCursor(params.cursor);
  if (offset === null) return null;
  const limit = Math.min(PAST_PAGE_MAX, Math.max(1, Math.floor(params.limit ?? PAST_PAGE_DEFAULT)));

  await connectDB();
  const [rows, ctx] = await Promise.all([
    Booking.find({ userId: params.userId }).populate("courtId", "name type").lean(),
    viewContext(),
  ]);
  const now = Date.now();
  const { upcoming, past } = splitBookings(rows as unknown as BookingSource[], now);
  const page = past.slice(offset, offset + limit);
  const proofs = await proofsByBooking([...upcoming, ...page].map((b) => b._id.toString()));
  const view = (b: BookingSource) =>
    toMobileBooking(b, { ...ctx, now, proofs: proofs.get(b._id.toString()) ?? [] });

  return {
    upcoming: upcoming.map(view),
    past: {
      items: page.map(view),
      nextCursor: offset + limit < past.length ? encodeCursor(offset + limit) : null,
    },
  };
}

/** One booking, only if it belongs to the user. */
export async function getMyAppBooking(userId: string, bookingId: string): Promise<MobileBooking | null> {
  return getAppBookingWhere(bookingId, { userId });
}

/** One booking in the app's shape, found by id plus an owner filter. */
export async function getAppBookingWhere(
  bookingId: string,
  owner: Record<string, unknown>,
): Promise<MobileBooking | null> {
  if (!mongoose.isValidObjectId(bookingId)) return null;
  await connectDB();
  const [row, ctx] = await Promise.all([
    Booking.findOne({ ...owner, _id: bookingId }).populate("courtId", "name type").lean(),
    viewContext(),
  ]);
  if (!row) return null;
  const proofs = await proofsByBooking([bookingId]);
  return toMobileBooking(row as unknown as BookingSource, { ...ctx, proofs: proofs.get(bookingId) ?? [] });
}
