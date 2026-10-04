"use server";

import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import MembershipPlan from "@/models/MembershipPlan";
import UserMembership from "@/models/UserMembership";
import {
  activateMembership,
  ensureMembershipPlansSeeded,
  getActiveMembershipForUser,
} from "@/lib/membership";
import { revalidatePath } from "next/cache";
import {
  resolveCustomerActor,
  requireStaffActor,
  type StaffActorOpts,
} from "@/lib/action-auth";

export async function listMembershipPlans() {
  await ensureMembershipPlansSeeded();
  const plans = await MembershipPlan.find({ isActive: true })
    .sort({ sortOrder: 1 })
    .lean();
  return {
    success: true as const,
    plans: JSON.parse(JSON.stringify(plans)),
  };
}

export async function getMyMembership(opts?: {
  actorUserId?: string;
  trustedApiActor?: boolean;
}) {
  const gate = await resolveCustomerActor(opts);
  if (!gate.ok) {
    return { success: false as const, error: gate.error };
  }

  await ensureMembershipPlansSeeded();
  const membership = await getActiveMembershipForUser(gate.userId);
  const history = await UserMembership.find({ userId: gate.userId })
    .populate("planId")
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  return {
    success: true as const,
    membership: membership
      ? JSON.parse(JSON.stringify(membership))
      : null,
    history: JSON.parse(JSON.stringify(history)),
  };
}

export async function adminActivateMembership(
  input: {
    userId: string;
    planId: string;
    carryForwardHours?: boolean;
  },
  opts?: StaffActorOpts,
) {
  const gate = await requireStaffActor(opts);
  if (!gate.ok) {
    return { success: false as const, error: gate.error };
  }

  try {
    await ensureMembershipPlansSeeded();
    const membership = await activateMembership(input);
    revalidatePath("/admin/users");
    revalidatePath("/account/membership");
    return {
      success: true as const,
      membership: JSON.parse(JSON.stringify(membership)),
    };
  } catch (error: unknown) {
    return {
      success: false as const,
      error:
        error instanceof Error ? error.message : "Failed to activate membership",
    };
  }
}

export async function adminListUserMemberships(
  userId: string,
  opts?: StaffActorOpts,
) {
  const gate = await requireStaffActor(opts);
  if (!gate.ok) {
    return { success: false as const, error: gate.error };
  }

  await connectDB();
  const rows = await UserMembership.find({ userId })
    .populate("planId")
    .sort({ createdAt: -1 })
    .lean();
  return { success: true as const, memberships: JSON.parse(JSON.stringify(rows)) };
}

/** Staff roster: customers with membership + loyalty balance (search + pagination). */
export async function adminListMembershipRoster(
  input?: {
    search?: string;
    membershipFilter?: "all" | "active" | "none";
    page?: number;
    limit?: number;
  },
  opts?: StaffActorOpts,
) {
  const gate = await requireStaffActor(opts);
  if (!gate.ok) {
    return { success: false as const, error: gate.error };
  }

  await connectDB();
  const { default: User } = await import("@/models/User");
  const { default: LoyaltyAccount } = await import("@/models/LoyaltyAccount");

  const page = Math.max(1, Number(input?.page) || 1);
  const limit = Math.max(1, Math.min(100, Number(input?.limit) || 50));
  const search = (input?.search || "").trim();
  const membershipFilter = input?.membershipFilter || "all";

  const userQuery: Record<string, unknown> = { role: "user" };
  if (search) {
    const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    userQuery.$or = [{ name: rx }, { email: rx }, { phone: rx }];
  }

  const now = new Date();
  const activeMemberships = await UserMembership.find({
    status: "active",
    validUntil: { $gte: now },
  })
    .select("userId")
    .lean();
  const memberUserIds = [
    ...new Set(activeMemberships.map((m) => m.userId.toString())),
  ];

  if (membershipFilter === "active") {
    if (memberUserIds.length === 0) {
      return {
        success: true as const,
        rows: [],
        totalCount: 0,
        page,
        limit,
      };
    }
    userQuery._id = {
      $in: memberUserIds.map((id) => new mongoose.Types.ObjectId(id)),
    };
  } else if (membershipFilter === "none" && memberUserIds.length > 0) {
    userQuery._id = {
      $nin: memberUserIds.map((id) => new mongoose.Types.ObjectId(id)),
    };
  }

  const totalCount = await User.countDocuments(userQuery);
  const users = await User.find(userQuery)
    .select("name email phone")
    .sort({ name: 1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();
  const userIds = users.map((u) => u._id);

  const [memberships, loyaltyAccounts] = await Promise.all([
    UserMembership.find({
      userId: { $in: userIds },
      status: "active",
      validUntil: { $gte: now },
    })
      .populate("planId", "name slug hours")
      .lean(),
    LoyaltyAccount.find({ userId: { $in: userIds } })
      .select("userId balance")
      .lean(),
  ]);

  const membershipByUser = new Map<string, (typeof memberships)[number]>();
  for (const m of memberships) {
    const key = m.userId.toString();
    const prev = membershipByUser.get(key);
    if (!prev || new Date(m.validUntil) > new Date(prev.validUntil)) {
      membershipByUser.set(key, m);
    }
  }

  const loyaltyByUser = new Map<string, number>();
  for (const a of loyaltyAccounts) {
    loyaltyByUser.set(a.userId.toString(), a.balance);
  }

  const rows = users.map((u) => {
    const id = u._id.toString();
    const membership = membershipByUser.get(id) || null;
    const plan =
      membership &&
      membership.planId &&
      typeof membership.planId === "object" &&
      "name" in membership.planId
        ? (membership.planId as { name?: string; slug?: string })
        : null;

    return {
      _id: id,
      name: u.name,
      email: u.email,
      phone: u.phone || null,
      loyaltyBalance: loyaltyByUser.get(id) ?? 0,
      membership: membership
        ? {
            _id: membership._id.toString(),
            planName: plan?.name || "Plan",
            planSlug: plan?.slug || null,
            hoursRemaining: membership.hoursRemaining,
            guestPassesRemaining: membership.guestPassesRemaining,
            validUntil: membership.validUntil,
            status: membership.status,
          }
        : null,
    };
  });

  return {
    success: true as const,
    rows: JSON.parse(JSON.stringify(rows)),
    totalCount,
    page,
    limit,
  };
}
