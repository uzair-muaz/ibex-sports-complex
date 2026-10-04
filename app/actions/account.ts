"use server";

import bcrypt from "bcryptjs";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Booking from "@/models/Booking";
import { revalidatePath } from "next/cache";
import { resolveCustomerActor } from "@/lib/action-auth";

export async function getMyProfile(opts?: {
  actorUserId?: string;
  trustedApiActor?: boolean;
}) {
  const gate = await resolveCustomerActor(opts);
  if (!gate.ok) return { success: false as const, error: gate.error };

  await connectDB();
  const user = await User.findById(gate.userId).select(
    "name email phone image role createdAt password googleId",
  );
  if (!user) return { success: false as const, error: "User not found" };

  const plain = user.toObject();
  const hasPassword = !!plain.password;
  const hasGoogleAuth = !!plain.googleId;
  delete plain.password;
  delete plain.googleId;

  return {
    success: true as const,
    user: {
      ...JSON.parse(JSON.stringify(plain)),
      hasPassword,
      hasGoogleAuth,
    },
  };
}

export async function updateMyProfile(
  input: {
    name?: string;
    phone?: string;
  },
  opts?: { actorUserId?: string; trustedApiActor?: boolean },
) {
  const gate = await resolveCustomerActor(opts);
  if (!gate.ok) return { success: false as const, error: gate.error };

  await connectDB();
  const updates: { name?: string; phone?: string } = {};
  if (typeof input.name === "string" && input.name.trim()) {
    updates.name = input.name.trim();
  }
  if (typeof input.phone === "string") {
    updates.phone = input.phone.trim();
  }

  const user = await User.findByIdAndUpdate(gate.userId, updates, {
    new: true,
  }).select("name email phone image role");

  if (!user) return { success: false as const, error: "User not found" };

  revalidatePath("/account");
  return {
    success: true as const,
    user: JSON.parse(JSON.stringify(user)),
  };
}

/**
 * Set or change the signed-in customer's password.
 * Google-only accounts (no password yet) can set one without a current password.
 * Accounts that already have a password must provide the current one.
 */
export async function setMyPassword(
  input: {
    currentPassword?: string;
    newPassword: string;
  },
  opts?: { actorUserId?: string; trustedApiActor?: boolean },
) {
  const gate = await resolveCustomerActor(opts);
  if (!gate.ok) return { success: false as const, error: gate.error };

  const newPassword = input.newPassword || "";
  if (newPassword.length < 6) {
    return {
      success: false as const,
      error: "New password must be at least 6 characters.",
    };
  }

  await connectDB();
  const user = await User.findById(gate.userId).select("password");
  if (!user) return { success: false as const, error: "User not found" };

  if (user.password) {
    const current = input.currentPassword || "";
    if (!current) {
      return {
        success: false as const,
        error: "Current password is required.",
      };
    }
    const ok = await bcrypt.compare(current, user.password);
    if (!ok) {
      return {
        success: false as const,
        error: "Current password is incorrect.",
      };
    }
  }

  user.password = await bcrypt.hash(newPassword, 12);
  await user.save();

  revalidatePath("/account");
  return {
    success: true as const,
    hasPassword: true,
  };
}

/** Link guest bookings with matching email to this account. */
export async function claimBookingsByEmail(opts?: {
  actorUserId?: string;
  trustedApiActor?: boolean;
}) {
  const gate = await resolveCustomerActor(opts);
  if (!gate.ok) return { success: false as const, error: gate.error };

  await connectDB();
  const user = await User.findById(gate.userId).select("email");
  const email = user?.email?.toLowerCase();
  if (!email) return { success: false as const, error: "No email on account" };

  const result = await Booking.updateMany(
    {
      userEmail: email,
      $or: [{ userId: { $exists: false } }, { userId: null }],
    },
    { $set: { userId: gate.userId } },
  );

  revalidatePath("/account/bookings");
  return {
    success: true as const,
    claimed: result.modifiedCount,
  };
}
