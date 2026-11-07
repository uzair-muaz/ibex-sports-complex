import crypto from "crypto";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Booking from "@/models/Booking";
import User from "@/models/User";
import LoyaltyAccount from "@/models/LoyaltyAccount";
import LoyaltyTransaction from "@/models/LoyaltyTransaction";
import IdempotencyRecord from "@/models/IdempotencyRecord";
import { resolveSlot } from "@/lib/api/slot";
import { getAppSettings } from "@/lib/app-settings";
import { computeQuote } from "@/lib/pricing/quote";
import { acquireSlotLocks, releaseSlotLocks } from "@/lib/booking-locks";
import { nextBookingSerial } from "@/lib/booking-serial";
import { overlapsBooking, pakistanNow } from "@/lib/booking-overlap";
import { shiftDateKey } from "@/lib/date-time";
import { normalizePakPhone } from "@/lib/phone";
import { isStaffRole } from "@/lib/authz";
import { toMobileBooking, type MobileBooking } from "@/lib/api/booking-view";
import type { ApiUser } from "@/lib/api/types";

const ACTIVE_STATUSES = ["pending_payment", "confirmed", "completed"];
/** Most upcoming bookings one guest (same email or phone) may hold at once. */
export const GUEST_ACTIVE_BOOKING_LIMIT = 3;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type AppBookingBody = {
  courtId?: unknown;
  start?: unknown;
  durationMinutes?: unknown;
  usePoints?: unknown;
  useWallet?: unknown;
  guest?: { name?: unknown; email?: unknown; phone?: unknown } | null;
};

export type AppBookingResult =
  | { ok: true; status: 200 | 201; booking: MobileBooking; guestAccessToken: string | null }
  | { ok: false; status: number; code: string; error: string };

const fail = (status: number, code: string, error: string): AppBookingResult => ({
  ok: false,
  status,
  code,
  error,
});

export function newGuestAccessToken(): string {
  return `gt_${crypto.randomBytes(24).toString("base64url")}`;
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/** Same request = same court, start, length and choices. */
export function requestHash(body: AppBookingBody): string {
  const guest = body.guest ?? null;
  const stable = JSON.stringify([
    body.courtId ?? null,
    body.start ?? null,
    Number(body.durationMinutes) || null,
    body.usePoints === true,
    body.useWallet === true,
    guest ? [guest.name ?? null, String(guest.email ?? "").toLowerCase(), guest.phone ?? null] : null,
  ]);
  return crypto.createHash("sha256").update(stable).digest("hex");
}

type Contact = { userId: string | null; name: string; email: string; phone: string };

export function validateGuest(guest: AppBookingBody["guest"]):
  | { ok: true; contact: Contact }
  | { ok: false; code: string; error: string } {
  if (!guest || typeof guest !== "object") {
    return { ok: false, code: "VALIDATION_ERROR", error: "Please sign in, or add your name, email and phone." };
  }
  const name = typeof guest.name === "string" ? guest.name.trim() : "";
  const email = typeof guest.email === "string" ? guest.email.trim().toLowerCase() : "";
  if (name.length < 2 || name.length > 80) {
    return { ok: false, code: "VALIDATION_ERROR", error: "Please enter your name." };
  }
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return { ok: false, code: "VALIDATION_ERROR", error: "Please enter a valid email address." };
  }
  const phone = normalizePakPhone(typeof guest.phone === "string" ? guest.phone : "");
  if (!phone) {
    return {
      ok: false,
      code: "INVALID_PHONE",
      error: "Please enter a valid Pakistani mobile number (03XXXXXXXXX).",
    };
  }
  return { ok: true, contact: { userId: null, name, email, phone } };
}

async function viewFor(bookingId: mongoose.Types.ObjectId | string, settings: {
  cancellationNoticeMinutes: number;
  payments: { minAdvancePercent: number };
}) {
  const booking = await Booking.findById(bookingId).populate("courtId", "name type").lean();
  if (!booking) return null;
  return toMobileBooking(booking as never, {
    cancellationNoticeMinutes: settings.cancellationNoticeMinutes,
    minAdvancePercent: settings.payments.minAdvancePercent,
  });
}

/**
 * Make a booking from the mobile app (guest or signed-in customer).
 * Safe against double booking (half-hour locks) and double taps
 * (Idempotency-Key). Sends no email (notifications come in a later phase).
 */
export async function createAppBooking(params: {
  body: AppBookingBody;
  user: ApiUser | null;
  idempotencyKey: string | null;
}): Promise<AppBookingResult> {
  const { body, user } = params;
  await connectDB();

  // 1. Who is booking?
  let contact: Contact;
  if (user) {
    if (isStaffRole(user.role)) {
      return fail(403, "STAFF_ACCOUNT", "Staff accounts can't book in the customer app.");
    }
    const profile = await User.findById(user.id).select("name email phone").lean();
    if (!profile) return fail(401, "UNAUTHORIZED", "Unauthorized");
    const phone = normalizePakPhone(profile.phone);
    if (!phone) {
      return fail(400, "PHONE_REQUIRED", "Please add your mobile number to your profile before booking.");
    }
    contact = { userId: user.id, name: profile.name || "Customer", email: profile.email, phone };
  } else {
    const g = validateGuest(body.guest);
    if (!g.ok) return fail(400, g.code, g.error);
    contact = g.contact;
  }

  // 2. Same Idempotency-Key again? Return the first booking (before checking
  //    the slot, which that first booking now holds).
  const key = params.idempotencyKey?.trim() || null;
  if (key && key.length > 200) {
    return fail(400, "VALIDATION_ERROR", "Idempotency-Key is too long (max 200).");
  }
  const scopeKey = key ? `${user ? `user:${user.id}` : `guest:${contact.email}`}:${key}` : null;
  const hash = requestHash(body);
  if (scopeKey) {
    try {
      await IdempotencyRecord.create({ scopeKey, requestHash: hash, status: "pending" });
    } catch (err) {
      if ((err as { code?: number }).code !== 11000) throw err;
      const existing = await IdempotencyRecord.findOne({ scopeKey }).select("+guestAccessToken").lean();
      if (!existing) return fail(409, "REQUEST_IN_PROGRESS", "Please try again in a moment.");
      if (existing.requestHash !== hash) {
        return fail(422, "IDEMPOTENCY_KEY_REUSED", "This Idempotency-Key was already used for a different booking.");
      }
      if (existing.status !== "done" || !existing.bookingId) {
        return fail(409, "REQUEST_IN_PROGRESS", "This booking is still being made. Please wait a moment.");
      }
      const view = await viewFor(existing.bookingId, await getAppSettings());
      if (!view) return fail(404, "BOOKING_NOT_FOUND", "Booking not found");
      return { ok: true, status: 200, booking: view, guestAccessToken: existing.guestAccessToken ?? null };
    }
  }

  const bookingId = new mongoose.Types.ObjectId();
  let locked = false;
  let pointsTaken = 0;

  const undo = async () => {
    if (pointsTaken > 0 && contact.userId) {
      await LoyaltyAccount.updateOne({ userId: contact.userId }, { $inc: { balance: pointsTaken } }).catch(() => {});
      await LoyaltyTransaction.deleteOne({ bookingId, type: "redeem" }).catch(() => {});
    }
    if (locked) await releaseSlotLocks(bookingId).catch(() => {});
    if (scopeKey) await IdempotencyRecord.deleteOne({ scopeKey, status: "pending" }).catch(() => {});
  };

  try {
    // 3. Check the court, time and price.
    const slot = await resolveSlot({
      courtId: body.courtId,
      start: body.start,
      durationMinutes: body.durationMinutes,
    });
    if (!slot.ok) {
      await undo();
      return fail(slot.status, slot.code, slot.error);
    }
    const { settings } = slot;

    // 4. Guest limit.
    if (!contact.userId) {
      const today = pakistanNow().dateKey;
      const active = await Booking.countDocuments({
        userId: { $exists: false },
        status: { $in: ["pending_payment", "confirmed"] },
        date: { $gte: today },
        $or: [{ userEmail: contact.email }, { userPhone: contact.phone }],
      });
      if (active >= GUEST_ACTIVE_BOOKING_LIMIT) {
        await undo();
        return fail(
          429,
          "GUEST_LIMIT_REACHED",
          `Guests can hold up to ${GUEST_ACTIVE_BOOKING_LIMIT} upcoming bookings. Please sign in to book more.`,
        );
      }
    }

    // 5. Claim the half hours. Only one request can win each one.
    const durationHours = slot.durationMinutes / 60;
    locked = await acquireSlotLocks({
      courtId: slot.court._id,
      bookingId,
      dateKey: slot.dateKey,
      startHour: slot.startHour,
      durationHours,
    });
    if (!locked) {
      await undo();
      return fail(409, "SLOT_UNAVAILABLE", "This time was just booked by someone else. Please pick another.");
    }

    // 6. Check again (covers bookings made by paths that don't lock, like admin edits).
    const nearby = await Booking.find({
      courtId: slot.court._id,
      _id: { $ne: bookingId },
      date: { $in: [shiftDateKey(slot.dateKey, -1), slot.dateKey, shiftDateKey(slot.dateKey, 1)] },
      status: { $in: ACTIVE_STATUSES },
    })
      .select("date startTime duration")
      .lean();
    if (nearby.some((b) => overlapsBooking(slot.dateKey, slot.startHour, durationHours, b))) {
      await undo();
      return fail(409, "SLOT_UNAVAILABLE", "This time is already booked. Please pick another.");
    }

    // 7. Price (same maths as the quote).
    let customer: { pointsBalance: number; walletBalance: number } | null = null;
    if (contact.userId) {
      const account = await LoyaltyAccount.findOne({ userId: contact.userId }).select("balance").lean();
      customer = { pointsBalance: account?.balance ?? 0, walletBalance: 0 };
    }
    const quote = computeQuote({
      originalCourtFee: slot.originalPrice,
      courtFee: slot.price,
      durationMinutes: slot.durationMinutes,
      customer,
      usePoints: body.usePoints === true,
      useWallet: body.useWallet === true,
      loyalty: settings.loyalty,
      minAdvancePercent: settings.payments.minAdvancePercent,
    });

    // 8. Take the points (only if the balance is still there).
    const pointsUsed = quote.points?.used ?? 0;
    if (pointsUsed > 0 && contact.userId) {
      const account = await LoyaltyAccount.findOneAndUpdate(
        { userId: contact.userId, balance: { $gte: pointsUsed } },
        { $inc: { balance: -pointsUsed } },
        { new: true },
      );
      if (!account) {
        await undo();
        return fail(409, "POINTS_CHANGED", "Your points balance changed. Please check the price again.");
      }
      pointsTaken = pointsUsed;
      await LoyaltyTransaction.create({
        userId: contact.userId,
        type: "redeem",
        points: -pointsUsed,
        balanceAfter: account.balance,
        bookingId,
        note: `Redeemed ${pointsUsed} points (app)`,
      });
    }

    // 9. Save the booking.
    const guestAccessToken = contact.userId ? null : newGuestAccessToken();
    const discounts = slot.discounts.map((d) => ({
      discountId: new mongoose.Types.ObjectId(d.discountId),
      name: d.name,
      type: d.type,
      value: d.value,
      amountSaved: d.amountSaved,
    }));
    await Booking.create({
      _id: bookingId,
      courtId: slot.court._id,
      date: slot.dateKey,
      startTime: slot.startHour,
      duration: durationHours,
      serialNumber: await nextBookingSerial(),
      userId: contact.userId ?? undefined,
      userName: contact.name,
      userEmail: contact.email,
      userPhone: contact.phone,
      status: quote.toTransfer === 0 ? "confirmed" : "pending_payment",
      originalPrice: quote.originalCourtFee,
      discounts,
      discountAmount: quote.promotionDiscount,
      loyaltyPointsRedeemed: pointsUsed,
      loyaltyDiscountPkr: quote.points?.discount ?? 0,
      totalPrice: quote.total,
      amountPaid: 0,
      source: "app",
      advanceRequired: quote.advanceRequired,
      advancePercent: quote.advancePercent,
      walletCreditUsed: quote.wallet?.used ?? 0,
      guestAccessTokenHash: guestAccessToken ? hashToken(guestAccessToken) : undefined,
    });

    if (scopeKey) {
      await IdempotencyRecord.updateOne(
        { scopeKey },
        { $set: { status: "done", bookingId, guestAccessToken } },
      );
    }

    const view = await viewFor(bookingId, settings);
    return { ok: true, status: 201, booking: view!, guestAccessToken };
  } catch (err) {
    await undo();
    throw err;
  }
}
