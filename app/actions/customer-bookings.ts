"use server";

import connectDB from "@/lib/mongodb";
import Booking from "@/models/Booking";
import {
  customerCanCancelBooking,
} from "@/lib/membership-rules";
import { refundLoyaltyForBooking } from "@/lib/loyalty";
import { refundMembershipHours } from "@/lib/membership";
import { revalidatePath } from "next/cache";
import { resolveCustomerActor } from "@/lib/action-auth";

function bookingEndMs(date: string, startTime: number, duration: number) {
  const [y, m, d] = date.split("-").map(Number);
  const hour = Math.floor(startTime);
  const minutes = Math.round((startTime - hour) * 60);
  const start = new Date(y, m - 1, d, hour, minutes, 0, 0);
  return start.getTime() + duration * 60 * 60 * 1000;
}

function isUpcoming(booking: {
  date: string;
  startTime: number;
  duration: number;
  status: string;
}) {
  if (booking.status === "cancelled" || booking.status === "completed") {
    return false;
  }
  return bookingEndMs(booking.date, booking.startTime, booking.duration) > Date.now();
}

export async function getMyBookings(opts?: {
  actorUserId?: string;
  trustedApiActor?: boolean;
}) {
  const gate = await resolveCustomerActor(opts);
  if (!gate.ok) {
    return { success: false as const, error: gate.error };
  }

  await connectDB();
  const bookings = await Booking.find({ userId: gate.userId })
    .populate("courtId")
    .sort({ date: -1, startTime: -1 })
    .lean();

  const serialized = JSON.parse(JSON.stringify(bookings)) as Array<{
    date: string;
    startTime: number;
    duration: number;
    status: string;
  }>;

  const upcoming = serialized.filter(isUpcoming);
  const past = serialized.filter((b) => !isUpcoming(b));

  return { success: true as const, upcoming, past };
}

export async function getMyBookingById(
  bookingId: string,
  opts?: { actorUserId?: string; trustedApiActor?: boolean },
) {
  const gate = await resolveCustomerActor(opts);
  if (!gate.ok) {
    return { success: false as const, error: gate.error };
  }

  await connectDB();
  const booking = await Booking.findOne({
    _id: bookingId,
    userId: gate.userId,
  }).populate("courtId");

  if (!booking) {
    return { success: false as const, error: "Booking not found" };
  }

  return {
    success: true as const,
    booking: JSON.parse(JSON.stringify(booking)),
    canCancel: customerCanCancelBooking({
      status: booking.status,
      date: booking.date,
      startTime: booking.startTime,
    }),
  };
}

export async function cancelMyBooking(
  bookingId: string,
  opts?: { actorUserId?: string; trustedApiActor?: boolean },
) {
  const gate = await resolveCustomerActor(opts);
  if (!gate.ok) {
    return { success: false as const, error: gate.error };
  }

  await connectDB();
  const booking = await Booking.findOne({
    _id: bookingId,
    userId: gate.userId,
  });

  if (!booking) {
    return { success: false as const, error: "Booking not found" };
  }

  if (
    !customerCanCancelBooking({
      status: booking.status,
      date: booking.date,
      startTime: booking.startTime,
    })
  ) {
    return {
      success: false as const,
      error: "This booking can no longer be cancelled online.",
    };
  }

  booking.status = "cancelled";
  await booking.save();

  await refundLoyaltyForBooking(bookingId);

  if (booking.usedMembershipHours && booking.membershipId) {
    await refundMembershipHours({
      membershipId: booking.membershipId.toString(),
      hours: booking.membershipHoursUsed || booking.duration,
      refundGuestPass: !!booking.usedGuestPass,
    });
  }

  revalidatePath("/account/bookings");
  revalidatePath(`/account/bookings/${bookingId}`);
  revalidatePath("/booking");

  void import("@/lib/analytics/daily-rollup")
    .then(({ rebuildAnalyticsDaily }) =>
      rebuildAnalyticsDaily([booking.date]),
    )
    .catch((err) => console.error("Analytics daily rebuild failed:", err));

  return { success: true as const };
}
