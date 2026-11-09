import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Booking from "@/models/Booking";
import Court from "@/models/Court";
import Device from "@/models/Device";
import Feedback from "@/models/Feedback";
import Notification from "@/models/Notification";
import User from "@/models/User";
import { audit } from "@/lib/audit";
import { slotStartIso } from "@/lib/api/availability";
import { bookingReference } from "@/lib/api/booking-view";
import { revokeAllRefreshTokens } from "@/lib/api/refresh-tokens";
import { adjustLoyaltyPoints, getLoyaltyBalance } from "@/lib/loyalty";
import { debitWallet, walletBalance } from "@/lib/wallet";
import {
  anonymizedContact,
  anonymizedUser,
  appStatusNow,
  deletionRefusal,
  isBlockingBooking,
  type BlockingBooking,
  type DeletionBookingRow,
  type DeletionRefusal,
} from "@/lib/account-deletion-rules";

export type DeletionCheck = {
  canDelete: boolean;
  blockingBookings: BlockingBooking[];
  walletBalance: number;
  points: number;
};

async function blockingBookingsFor(userId: string, now: number): Promise<BlockingBooking[]> {
  const rows = (await Booking.find({ userId, status: { $in: ["pending_payment", "confirmed"] } })
    .select("serialNumber courtId date startTime duration status")
    .sort({ date: 1, startTime: 1 })
    .lean()) as unknown as DeletionBookingRow[];
  const blocking = rows.filter((b) => isBlockingBooking(b, now));
  if (blocking.length === 0) return [];
  const courts = await Court.find({ _id: { $in: blocking.map((b) => b.courtId) } }).select("name").lean();
  const names = new Map(courts.map((c) => [String(c._id), String(c.name)]));
  return blocking.map((b) => ({
    id: b._id.toString(),
    reference: bookingReference(b),
    courtName: names.get(b.courtId.toString()) ?? "Court",
    start: slotStartIso(b.date, b.startTime),
    status: appStatusNow(b, now),
  }));
}

/** What the app shows before the customer confirms. */
export async function getDeletionCheck(userId: string, now = Date.now()): Promise<DeletionCheck> {
  await connectDB();
  const [blockingBookings, wallet, points] = await Promise.all([
    blockingBookingsFor(userId, now),
    walletBalance(userId),
    getLoyaltyBalance(userId),
  ]);
  return { canDelete: blockingBookings.length === 0, blockingBookings, walletBalance: wallet, points };
}

export type DeleteResult = { ok: true } | ({ ok: false } & DeletionRefusal);

/**
 * Delete (anonymize) a customer account. Bookings and payments stay for the venue.
 * Sends no email or push.
 */
export async function deleteCustomerAccount(params: { userId: string; forfeitWallet: boolean; now?: Date }): Promise<DeleteResult> {
  const { userId, forfeitWallet } = params;
  const now = params.now ?? new Date();
  await connectDB();

  const first = await getDeletionCheck(userId, now.getTime());
  const refused = deletionRefusal({
    blockingCount: first.blockingBookings.length,
    walletBalance: first.walletBalance,
    forfeitWallet,
  });
  if (refused) return { ok: false, ...refused };

  // Lock the account first: from here its tokens stop working, so no new booking can sneak in.
  const locked = await User.updateOne(
    { _id: userId, role: "user", deletedAt: null },
    { $set: { deletedAt: now } },
  );
  if (locked.modifiedCount !== 1) return { ok: false, status: 409, code: "ACTIVE_BOOKINGS", message: "This account can't be deleted." };

  // Check again in case a booking was made a moment ago.
  const again = await blockingBookingsFor(userId, now.getTime());
  if (again.length > 0) {
    await User.updateOne({ _id: userId }, { $set: { deletedAt: null } });
    const r = deletionRefusal({ blockingCount: again.length, walletBalance: 0, forfeitWallet: true })!;
    return { ok: false, ...r };
  }

  let balance = 0;
  let points = 0;
  try {
    await revokeAllRefreshTokens(userId);
    await Device.deleteMany({ userId });

    balance = await walletBalance(userId);
    if (balance > 0) {
      await debitWallet({
        userId,
        amount: balance,
        reason: "account_deleted",
        refKey: `account-deleted:${userId}`,
        note: "Account deleted",
      });
    }
    points = await getLoyaltyBalance(userId);
    if (points > 0) {
      await adjustLoyaltyPoints({ userId, delta: -points, note: "Account deleted" });
    }

    const contact = anonymizedContact(userId);
    const bookingIds = (await Booking.find({ userId }).select("_id").lean()).map((b) => b._id as mongoose.Types.ObjectId);
    await Booking.updateMany({ userId }, { $set: contact });
    if (bookingIds.length) await Feedback.updateMany({ bookingId: { $in: bookingIds } }, { $set: contact });
    await Notification.deleteMany({ userId });
    await User.updateOne({ _id: userId }, anonymizedUser(userId, now));
  } catch (err) {
    // Unlock so the customer can try again. Every step above is safe to repeat.
    await User.updateOne({ _id: userId }, { $set: { deletedAt: null } }).catch(() => {});
    throw err;
  }

  await audit({
    actor: { userId, role: "user" },
    area: "users",
    action: "account_deleted",
    summary: `Customer deleted their account in the app${balance > 0 ? ` (lost PKR ${balance} wallet credit)` : ""}${points > 0 ? ` (lost ${points} points)` : ""}.`,
    targetId: userId,
    customerId: userId,
  });

  return { ok: true };
}
