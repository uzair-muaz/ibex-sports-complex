/** Super admin: block or unblock a customer. Server-only. */
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Device from "@/models/Device";
import Booking from "@/models/Booking";
import { revokeAllRefreshTokens } from "@/lib/api/refresh-tokens";
import { cleanBlockReason, phoneVariants } from "@/lib/customer-block-rules";

type Fail = { ok: false; status: number; code: string; error: string };
const bad = (error: string, code = "VALIDATION_ERROR", status = 400): Fail => ({ ok: false, status, code, error });

/**
 * Block: the customer is signed out of the app, can't sign in again and can't
 * book (with their account, email or phone). Their bookings stay as they are.
 */
export async function blockCustomer(params: { userId: string; reason: unknown; staffId: string }) {
  if (!mongoose.isValidObjectId(params.userId)) return bad("Customer not found", "USER_NOT_FOUND", 404);
  const reason = cleanBlockReason(params.reason);
  if (!reason) return bad("Write a reason (3 to 300 letters).");
  await connectDB();
  const user = await User.findOneAndUpdate(
    { _id: params.userId, role: "user" },
    { $set: { blockedAt: new Date(), blockedReason: reason, blockedBy: params.staffId } },
    { new: true },
  ).lean();
  if (!user) return bad("Customer not found", "USER_NOT_FOUND", 404);
  await Promise.all([revokeAllRefreshTokens(params.userId), Device.deleteMany({ userId: params.userId })]);
  const upcoming = await Booking.countDocuments({
    $or: [{ userId: params.userId }, { userEmail: user.email }],
    status: { $in: ["pending_payment", "confirmed"] },
    date: { $gte: new Date(Date.now() + 5 * 3_600_000).toISOString().slice(0, 10) },
  });
  return { ok: true as const, user: { id: String(user._id), name: user.name, email: user.email }, reason, upcomingBookings: upcoming };
}

export async function unblockCustomer(params: { userId: string }) {
  if (!mongoose.isValidObjectId(params.userId)) return bad("Customer not found", "USER_NOT_FOUND", 404);
  await connectDB();
  const user = await User.findOneAndUpdate(
    { _id: params.userId, role: "user" },
    { $set: { blockedAt: null, blockedReason: null, blockedBy: null } },
    { new: true },
  ).lean();
  if (!user) return bad("Customer not found", "USER_NOT_FOUND", 404);
  return { ok: true as const, user: { id: String(user._id), name: user.name, email: user.email } };
}

/** Is this account, email or phone blocked? (Guests can't get round a block by typing the same email or phone.) */
export async function isBookingBlocked(who: { userId?: string | null; email?: string | null; phone?: string | null }): Promise<boolean> {
  const or: Record<string, unknown>[] = [];
  if (who.userId && mongoose.isValidObjectId(who.userId)) or.push({ _id: who.userId });
  const email = who.email?.trim().toLowerCase();
  if (email) or.push({ email });
  const phones = phoneVariants(who.phone);
  if (phones.length) or.push({ phone: { $in: phones } });
  if (or.length === 0) return false;
  await connectDB();
  return !!(await User.exists({ role: "user", blockedAt: { $type: "date" }, $or: or }));
}
