/**
 * Promo codes on the server: check one for a customer, use it on a booking,
 * give the use back when the booking is cancelled. Server-only (NOT "use server").
 */
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import PromoCode from "@/models/PromoCode";
import PromoRedemption from "@/models/PromoRedemption";
import Booking from "@/models/Booking";
import { evaluatePromo, isValidCodeText, normaliseCode, PROMO_REASON_TEXT, type PromoCheck } from "@/lib/promo-rules";

export type PromoCustomer = { userId?: string | null; email?: string | null };

/** Check a code for this customer and court fee. Nothing is saved. */
export async function checkPromo(params: {
  code: unknown;
  sport: string;
  courtFee: number;
  customer: PromoCustomer;
}): Promise<PromoCheck & { promoId?: string }> {
  const code = normaliseCode(params.code);
  if (!isValidCodeText(code)) {
    return { ok: false, code, reasonCode: "PROMO_NOT_FOUND", message: PROMO_REASON_TEXT.PROMO_NOT_FOUND };
  }
  await connectDB();
  const promo = await PromoCode.findOne({ code }).lean();
  const email = params.customer.email?.trim().toLowerCase() || null;
  const userId = params.customer.userId && mongoose.isValidObjectId(params.customer.userId) ? params.customer.userId : null;

  const who: Record<string, unknown>[] = [];
  if (userId) who.push({ userId });
  if (email) who.push({ email });
  const bookingWho: Record<string, unknown>[] = [];
  if (userId) bookingWho.push({ userId });
  if (email) bookingWho.push({ userEmail: email });

  const [usesByCustomer, earlier] = promo
    ? await Promise.all([
        who.length ? PromoRedemption.countDocuments({ promoId: promo._id, status: "used", $or: who }) : Promise.resolve(0),
        promo.newCustomersOnly && bookingWho.length
          ? Booking.exists({ status: { $ne: "cancelled" }, $or: bookingWho })
          : Promise.resolve(null),
      ])
    : [0, null];

  const result = evaluatePromo(promo, {
    code,
    sport: params.sport,
    courtFee: params.courtFee,
    usesByCustomer,
    hasEarlierBooking: !!earlier,
  });
  return result.ok ? { ...result, promoId: promo!._id.toString() } : result;
}

/**
 * Use the code on a booking (after checkPromo said yes). One database step
 * claims a use, so the last use can't be taken twice. Returns false if the
 * code ran out in the meantime.
 */
export async function usePromo(params: {
  promoId: string;
  code: string;
  bookingId: mongoose.Types.ObjectId | string;
  customer: PromoCustomer;
  discountPkr: number;
}): Promise<boolean> {
  await connectDB();
  const claimed = await PromoCode.findOneAndUpdate(
    {
      _id: params.promoId,
      isActive: true,
      $or: [{ maxUses: null }, { maxUses: { $exists: false } }, { $expr: { $lt: ["$usedCount", "$maxUses"] } }],
    },
    { $inc: { usedCount: 1 } },
    { new: true },
  );
  if (!claimed) return false;
  try {
    await PromoRedemption.create({
      promoId: params.promoId,
      code: params.code,
      bookingId: params.bookingId,
      userId: params.customer.userId ?? null,
      email: (params.customer.email ?? "").toLowerCase() || "unknown",
      discountPkr: params.discountPkr,
    });
  } catch (err) {
    await PromoCode.updateOne({ _id: params.promoId }, { $inc: { usedCount: -1 } });
    throw err;
  }
  return true;
}

/** Undo usePromo when the booking could not be saved. */
export async function undoPromoUse(bookingId: mongoose.Types.ObjectId | string): Promise<void> {
  const r = await PromoRedemption.findOneAndDelete({ bookingId, status: "used" }).lean();
  if (r) await PromoCode.updateOne({ _id: r.promoId, usedCount: { $gt: 0 } }, { $inc: { usedCount: -1 } });
}

/** A cancelled booking gives its promo use back (only once). */
export async function releasePromoForBooking(bookingId: mongoose.Types.ObjectId | string): Promise<void> {
  await connectDB();
  const r = await PromoRedemption.findOneAndUpdate(
    { bookingId, status: "used" },
    { $set: { status: "released" } },
    { new: true },
  ).lean();
  if (r) await PromoCode.updateOne({ _id: r.promoId, usedCount: { $gt: 0 } }, { $inc: { usedCount: -1 } });
}
