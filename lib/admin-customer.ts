/**
 * Staff: everything about one customer on one page — profile, bookings,
 * wallet, points, membership hours and support tickets. Server-only.
 */
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Booking from "@/models/Booking";
import SupportTicket from "@/models/SupportTicket";
import { isStaffRole } from "@/lib/authz";
import { buildWallet } from "@/lib/api/wallet-view";
import { buildAppLoyalty } from "@/lib/api/loyalty-view";
import { membershipHoursHistory } from "@/lib/membership-admin";
import { bookingReference, bookingStartMs } from "@/lib/api/booking-view";
import { toPkIso } from "@/lib/api/time";

export type CustomerBookingRow = {
  id: string;
  reference: string;
  sport: string | null;
  court: string | null;
  date: string;
  startTime: number;
  duration: number;
  status: "pending_payment" | "confirmed" | "cancelled" | "completed";
  total: number;
  paid: number;
  /** Still to pay (0 when cancelled). */
  due: number;
  /** Booked before the customer had an account (matched by email). */
  guest: boolean;
  usedHours: boolean;
  refundToWallet: number;
};

type BookingLean = {
  _id: mongoose.Types.ObjectId;
  serialNumber?: number | null;
  date: string;
  startTime: number;
  duration: number;
  status: CustomerBookingRow["status"];
  totalPrice: number;
  amountPaid?: number | null;
  walletCreditUsed?: number | null;
  userId?: mongoose.Types.ObjectId | null;
  usedMembershipHours?: boolean;
  refundAmount?: number | null;
  courtId?: { name?: string; type?: string } | null;
};

/** Pure: booking rows and the totals shown at the top of the page. */
export function summariseBookings(rows: BookingLean[], now = Date.now()) {
  const list: CustomerBookingRow[] = rows.map((b) => {
    const paid = Math.round((b.amountPaid ?? 0) + (b.walletCreditUsed ?? 0));
    return {
      id: b._id.toString(),
      reference: bookingReference(b),
      sport: b.courtId?.type ?? null,
      court: b.courtId?.name ?? null,
      date: b.date,
      startTime: b.startTime,
      duration: b.duration,
      status: b.status,
      total: Math.round(b.totalPrice ?? 0),
      paid,
      due: b.status === "cancelled" ? 0 : Math.max(0, Math.round(b.totalPrice ?? 0) - paid),
      guest: !b.userId,
      usedHours: !!b.usedMembershipHours,
      refundToWallet: Math.round(b.refundAmount ?? 0),
    };
  });
  const active = rows.filter((b) => b.status === "pending_payment" || b.status === "confirmed");
  return {
    bookings: list,
    stats: {
      total: rows.length,
      upcoming: active.filter((b) => bookingStartMs(b.date, b.startTime) > now).length,
      completed: rows.filter((b) => b.status === "completed").length,
      cancelled: rows.filter((b) => b.status === "cancelled").length,
      // Money kept for bookings that weren't cancelled.
      paidTotal: list.filter((b) => b.status !== "cancelled").reduce((s, b) => s + b.paid, 0),
      // Still owed on active bookings.
      dueTotal: list.reduce((s, b) => s + b.due, 0),
    },
  };
}

export async function buildCustomerPage(userId: string) {
  if (!mongoose.isValidObjectId(userId)) return null;
  await connectDB();
  const user = await User.findById(userId)
    .select("name email phone city role createdAt googleId appleId password blockedAt blockedReason blockedBy")
    .populate("blockedBy", "name")
    .lean();
  if (!user || isStaffRole(user.role)) return null;

  const [bookingRows, wallet, points, membership, tickets] = await Promise.all([
    // Their bookings, plus guest bookings made with the same email before they signed up.
    Booking.find({
      $or: [{ userId }, { userEmail: user.email, $or: [{ userId: { $exists: false } }, { userId: null }] }],
    })
      .sort({ date: -1, startTime: -1 })
      .limit(200)
      .select("serialNumber date startTime duration status totalPrice amountPaid walletCreditUsed userId usedMembershipHours refundAmount courtId")
      .populate("courtId", "name type")
      .lean(),
    buildWallet({ userId, limit: 10 }),
    buildAppLoyalty({ userId, limit: 10 }),
    membershipHoursHistory(userId),
    SupportTicket.find({ userId }).sort({ updatedAt: -1 }).limit(20).lean(),
  ]);

  const { bookings, stats } = summariseBookings(bookingRows as unknown as BookingLean[]);
  const current = membership.memberships.find((m) => m.status !== "cancelled") ?? membership.memberships[0] ?? null;

  return {
    customer: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      phone: user.phone ?? null,
      city: user.city ?? null,
      joined: toPkIso(user.createdAt),
      blocked: user.blockedAt
        ? {
            at: toPkIso(user.blockedAt),
            reason: user.blockedReason ?? "",
            by: (user.blockedBy as unknown as { name?: string } | null)?.name ?? null,
          }
        : null,
      signIn: [user.password ? "Email" : null, user.googleId ? "Google" : null, user.appleId ? "Apple" : null].filter(
        (v): v is string => !!v,
      ),
    },
    stats,
    bookings,
    wallet: { balance: wallet?.balance ?? 0, recent: wallet?.history.items ?? [] },
    points: {
      balance: points?.points ?? 0,
      pending: points?.pendingPoints ?? 0,
      recent: (points?.history.items ?? []).slice(0, 10),
    },
    membership: current,
    tickets: tickets.map((t) => {
      const last = t.messages[t.messages.length - 1];
      return {
        id: t._id.toString(),
        topic: t.topic,
        status: t.status,
        updatedAt: toPkIso(t.updatedAt),
        lastMessage: last ? { from: last.authorType, body: last.body.slice(0, 160) } : null,
      };
    }),
  };
}

export type CustomerPage = NonNullable<Awaited<ReturnType<typeof buildCustomerPage>>>;
