"use server";

import { audit } from "@/lib/audit";
import connectDB from "@/lib/mongodb";
import LoyaltyTransaction from "@/models/LoyaltyTransaction";
import {
  adjustLoyaltyPoints,
  getHoursPlayed,
  getLoyaltyBalance,
  getOrCreateLoyaltyAccount,
} from "@/lib/loyalty";
import { getAppSettings } from "@/lib/app-settings";
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
  const [balance, hoursPlayed, transactions, settings] = await Promise.all([
    getLoyaltyBalance(gate.userId),
    getHoursPlayed(gate.userId),
    LoyaltyTransaction.find({ userId: gate.userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean(),
    getAppSettings(),
  ]);
  const rules = settings.loyalty;

  return {
    success: true as const,
    balance,
    hoursPlayed,
    // Older fields kept for the website; `rules` has everything from App Settings.
    pointsPerHour: rules.earnBasis === "per_hour" ? rules.earnPoints : 0,
    minRedeem: rules.minRedeemPoints,
    rules,
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
    await audit({
      actor: gate,
      area: "points",
      action: "adjust",
      targetId: input.userId,
      customerId: input.userId,
      summary: `${input.delta > 0 ? "Added" : "Took away"} ${Math.abs(input.delta).toLocaleString()} points${input.note ? ` — ${input.note.slice(0, 200)}` : ""}. Balance now ${balance.toLocaleString()}.`,
    });
    revalidatePath("/admin/users");
    return { success: true as const, balance };
  } catch (error: unknown) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to adjust points",
    };
  }
}
