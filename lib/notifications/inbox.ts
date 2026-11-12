import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Notification from "@/models/Notification";
import Device from "@/models/Device";
import { decodeCursor, encodeCursor } from "@/lib/api/my-bookings";
import { toPkIso } from "@/lib/api/time";

/** The app's bell: my notifications, newest first, and how many are unread. */

export function toAppNotification(n: {
  _id: { toString(): string };
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  bookingId?: { toString(): string } | null;
  amount?: number | null;
  createdAt?: Date;
}) {
  return {
    id: n._id.toString(),
    type: n.type,
    title: n.title,
    body: n.body,
    isRead: n.isRead,
    bookingId: n.bookingId ? n.bookingId.toString() : null,
    amount: n.amount ?? null,
    createdAt: toPkIso(n.createdAt ?? null),
  };
}

export async function listNotifications(params: { userId: string; cursor?: string | null; limit?: number }) {
  const offset = decodeCursor(params.cursor);
  if (offset === null) return null;
  const limit = Math.min(50, Math.max(1, Math.floor(params.limit ?? 20)));
  await connectDB();
  const [rows, total, unreadCount] = await Promise.all([
    Notification.find({ userId: params.userId }).sort({ createdAt: -1, _id: -1 }).skip(offset).limit(limit).lean(),
    Notification.countDocuments({ userId: params.userId }),
    Notification.countDocuments({ userId: params.userId, isRead: false }),
  ]);
  return {
    items: rows.map((n) => toAppNotification(n as never)),
    unreadCount,
    nextCursor: offset + limit < total ? encodeCursor(offset + limit) : null,
  };
}

/** Mark some (ids) or all as read. Only the customer's own. */
export async function markRead(params: { userId: string; ids?: unknown; all?: unknown }) {
  await connectDB();
  const filter: Record<string, unknown> = { userId: params.userId, isRead: false };
  if (params.all !== true) {
    if (!Array.isArray(params.ids) || params.ids.length === 0 || params.ids.length > 100) return null;
    const ids = params.ids.filter((id): id is string => typeof id === "string" && mongoose.isValidObjectId(id));
    filter._id = { $in: ids };
  }
  await Notification.updateMany(filter, { $set: { isRead: true, readAt: new Date() } });
  return { unreadCount: await Notification.countDocuments({ userId: params.userId, isRead: false }) };
}

/** Save this phone's push token for the customer (moves it if another account had it). */
export async function registerDevice(params: { userId: string; platform: unknown; pushToken: unknown }) {
  const platform = params.platform;
  const token = typeof params.pushToken === "string" ? params.pushToken.trim() : "";
  if (platform !== "ios" && platform !== "android") return { ok: false as const, error: "platform must be ios or android." };
  if (token.length < 20 || token.length > 4096) return { ok: false as const, error: "pushToken is missing." };
  await connectDB();
  await Device.findOneAndUpdate(
    { pushToken: token },
    { $set: { userId: params.userId, platform, lastSeenAt: new Date() } },
    { upsert: true },
  );
  return { ok: true as const };
}

export async function removeDevice(params: { userId: string; pushToken: string }) {
  await connectDB();
  await Device.deleteOne({ userId: params.userId, pushToken: params.pushToken });
}
