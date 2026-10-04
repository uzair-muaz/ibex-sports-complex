"use server";

import connectDB from "@/lib/mongodb";
import LoyaltyTransaction from "@/models/LoyaltyTransaction";
import {
  adjustLoyaltyPoints,
  getHoursPlayed,
  getLoyaltyBalance,
  getOrCreateLoyaltyAccount,
} from "@/lib/loyalty";
import { LOYALTY_MIN_REDEEM_POINTS, LOYALTY_POINTS_PER_HOUR } from "@/lib/loyalty-rules";
import { revalidatePath } from "next/cache";
import {
  resolveCustomerActor,
  requireStaffActor,
  type StaffActorOpts,
} from "@/lib/action-auth";

export async function getMyLoyaltySummary(opts?: {
  actorUserId?: string;
  trustedApiActor?: boolean;
}) {
  const gate = await resolveCustomerActor(opts);
  if (!gate.ok) {
    return { success: false as const, error: gate.error };
  }

  await connectDB();
  await getOrCreateLoyaltyAccount(gate.userId);
  const [balance, hoursPlayed, transactions] = await Promise.all([
    getLoyaltyBalance(gate.userId),
    getHoursPlayed(gate.userId),
    LoyaltyTransaction.find({ userId: gate.userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean(),
  ]);

  return {
    success: true as const,
    balance,
    hoursPlayed,
    pointsPerHour: LOYALTY_POINTS_PER_HOUR,
    minRedeem: LOYALTY_MIN_REDEEM_POINTS,
    transactions: JSON.parse(JSON.stringify(transactions)),
  };
}

export async function adminAdjustLoyalty(
  input: {
    userId: string;
    delta: number;
    note?: string;
  },
  opts?: StaffActorOpts,
) {
  const gate = await requireStaffActor(opts);
  if (!gate.ok) {
    return { success: false as const, error: gate.error };
  }

  try {
    const balance = await adjustLoyaltyPoints(input);
    revalidatePath("/admin/users");
    return { success: true as const, balance };
  } catch (error: unknown) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to adjust points",
    };
  }
}
