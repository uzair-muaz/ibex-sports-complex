/**
 * Server-only helpers. NOT a "use server" file on purpose: that would turn every
 * export here (e.g. giving points) into an action anyone could call from a browser.
 * The checked actions live in app/actions/.
 */
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import LoyaltyAccount from "@/models/LoyaltyAccount";
import LoyaltyTransaction from "@/models/LoyaltyTransaction";
import Booking from "@/models/Booking";
import { maxUsablePoints, pointsDiscountPkr, pointsEarnedFor } from "@/lib/loyalty-rules";
import { getAppSettings } from "@/lib/app-settings";

export async function getOrCreateLoyaltyAccount(userId: string) {
  await connectDB();
  let account = await LoyaltyAccount.findOne({ userId });
  if (!account) {
    account = await LoyaltyAccount.create({ userId, balance: 0 });
  }
  return account;
}

export async function getLoyaltyBalance(userId: string): Promise<number> {
  const account = await getOrCreateLoyaltyAccount(userId);
  return account.balance;
}

/** Award points when a booking becomes completed. Idempotent per booking. */
export async function awardLoyaltyForCompletedBooking(bookingId: string) {
  await connectDB();
  const booking = await Booking.findById(bookingId);
  if (!booking || booking.status !== "completed" || !booking.userId) {
    return { success: false as const, skipped: true };
  }

  const existing = await LoyaltyTransaction.findOne({
    bookingId: booking._id,
    type: "earn",
  });
  if (existing) {
    return { success: true as const, skipped: true, points: existing.points };
  }

  // Rules from Admin → App Settings (default = 10 points per hour played).
  const { loyalty } = await getAppSettings();
  const points = pointsEarnedFor(loyalty, {
    paidTotal: booking.totalPrice,
    durationMinutes: Math.round(booking.duration * 60),
    membershipMinutes: booking.usedMembershipHours
      ? Math.round((booking.membershipHoursUsed || booking.duration) * 60)
      : 0,
    membershipValuePkr: booking.membershipDiscountPkr ?? 0,
  });
  if (points <= 0) {
    return { success: true as const, skipped: true, points: 0 };
  }

  const account = await LoyaltyAccount.findOneAndUpdate(
    { userId: booking.userId },
    { $inc: { balance: points }, $setOnInsert: { userId: booking.userId } },
    { upsert: true, new: true },
  );

  await LoyaltyTransaction.create({
    userId: booking.userId,
    type: "earn",
    points,
    balanceAfter: account.balance,
    bookingId: booking._id,
    note: `Earned for completed booking (${booking.duration}h)`,
  });

  const { notifyPointsEarned } = await import("@/lib/notifications/events");
  await notifyPointsEarned({ userId: booking.userId, points, bookingId: booking._id });

  return { success: true as const, skipped: false, points };
}

export async function redeemLoyaltyPoints(params: {
  userId: string;
  points: number;
  bookingId: mongoose.Types.ObjectId | string;
  totalPriceAfterPromo: number;
}) {
  await connectDB();
  const current = await getOrCreateLoyaltyAccount(params.userId);
  const { loyalty } = await getAppSettings();
  const allowed = maxUsablePoints(current.balance, params.totalPriceAfterPromo, loyalty);
  const points = Math.min(params.points, allowed);
  if (points < loyalty.minRedeemPoints && params.points > 0) {
    throw new Error(`Not enough points to redeem (minimum ${loyalty.minRedeemPoints}).`);
  }
  if (points <= 0) {
    return { points: 0, discountPkr: 0 };
  }

  const account = await LoyaltyAccount.findOneAndUpdate(
    { userId: params.userId, balance: { $gte: points } },
    { $inc: { balance: -points } },
    { new: true },
  );
  if (!account) {
    throw new Error("Not enough points to redeem.");
  }

  await LoyaltyTransaction.create({
    userId: params.userId,
    type: "redeem",
    points: -points,
    balanceAfter: account.balance,
    bookingId: params.bookingId,
    note: `Redeemed ${points} points`,
  });

  return { points, discountPkr: pointsDiscountPkr(points, params.totalPriceAfterPromo, loyalty) };
}

export async function refundLoyaltyForBooking(bookingId: string) {
  await connectDB();
  const booking = await Booking.findById(bookingId);
  if (!booking?.userId || !booking.loyaltyPointsRedeemed) {
    return { success: true as const, skipped: true };
  }

  const existingRefund = await LoyaltyTransaction.findOne({
    bookingId: booking._id,
    type: "refund",
  });
  if (existingRefund) {
    return { success: true as const, skipped: true };
  }

  const points = booking.loyaltyPointsRedeemed;
  const account = await LoyaltyAccount.findOneAndUpdate(
    { userId: booking.userId },
    { $inc: { balance: points }, $setOnInsert: { userId: booking.userId } },
    { upsert: true, new: true },
  );

  await LoyaltyTransaction.create({
    userId: booking.userId,
    type: "refund",
    points,
    balanceAfter: account.balance,
    bookingId: booking._id,
    note: "Refunded points after booking cancel",
  });

  return { success: true as const, skipped: false, points };
}

export async function adjustLoyaltyPoints(params: {
  userId: string;
  delta: number;
  note?: string;
}) {
  await connectDB();
  await getOrCreateLoyaltyAccount(params.userId);
  const filter: Record<string, unknown> = { userId: params.userId };
  if (params.delta < 0) {
    filter.balance = { $gte: Math.abs(params.delta) };
  }
  const account = await LoyaltyAccount.findOneAndUpdate(
    filter,
    { $inc: { balance: params.delta } },
    { new: true },
  );
  if (!account) {
    throw new Error("Balance cannot go negative");
  }
  await LoyaltyTransaction.create({
    userId: params.userId,
    type: "adjust",
    points: params.delta,
    balanceAfter: account.balance,
    note: params.note || "Admin adjustment",
  });
  return account.balance;
}

export async function getHoursPlayed(userId: string): Promise<number> {
  await connectDB();
  const rows = await Booking.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        status: "completed",
      },
    },
    { $group: { _id: null, hours: { $sum: "$duration" } } },
  ]);
  return rows[0]?.hours ?? 0;
}
