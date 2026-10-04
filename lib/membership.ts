"use server";

import connectDB from "@/lib/mongodb";
import MembershipPlan from "@/models/MembershipPlan";
import UserMembership from "@/models/UserMembership";
import {
  MEMBERSHIP_LAPSE_GRACE_DAYS,
  MEMBERSHIP_PLAN_SEEDS,
  MEMBERSHIP_VALIDITY_DAYS,
  canUseMembershipForSlot,
} from "@/lib/membership-rules";

export async function ensureMembershipPlansSeeded() {
  await connectDB();
  for (const seed of MEMBERSHIP_PLAN_SEEDS) {
    await MembershipPlan.findOneAndUpdate(
      { slug: seed.slug },
      {
        $setOnInsert: {
          slug: seed.slug,
          name: seed.name,
          price: seed.price,
          hours: seed.hours,
          weekdayOnly: seed.weekdayOnly,
          guestPassesPerPeriod: seed.guestPassesPerPeriod,
          priorityBadge: seed.priorityBadge,
          courtTypes: seed.courtTypes,
          sortOrder: seed.sortOrder,
          isActive: true,
        },
      },
      { upsert: true, new: true },
    );
  }
}

export async function getActiveMembershipForUser(userId: string) {
  await connectDB();
  const now = new Date();
  const membership = await UserMembership.findOne({
    userId,
    status: "active",
    validUntil: { $gte: now },
  }).populate("planId");

  if (!membership) {
    // Expire stale actives
    await UserMembership.updateMany(
      { userId, status: "active", validUntil: { $lt: now } },
      { $set: { status: "expired" } },
    );
    return null;
  }
  return membership;
}

export async function activateMembership(params: {
  userId: string;
  planId: string;
  carryForwardHours?: boolean;
}) {
  await connectDB();
  const plan = await MembershipPlan.findById(params.planId);
  if (!plan || !plan.isActive) {
    throw new Error("Membership plan not found");
  }

  const now = new Date();
  const existing = await UserMembership.findOne({
    userId: params.userId,
    status: "active",
  }).sort({ validUntil: -1 });

  let carryHours = 0;
  if (existing) {
    const graceEnd = new Date(existing.validUntil);
    graceEnd.setDate(graceEnd.getDate() + MEMBERSHIP_LAPSE_GRACE_DAYS);
    const withinGraceOrActive =
      existing.validUntil >= now || graceEnd >= now;
    if (params.carryForwardHours !== false && withinGraceOrActive) {
      carryHours = existing.hoursRemaining;
    }
    existing.status = "cancelled";
    await existing.save();
  }

  const validUntil = new Date(now);
  validUntil.setDate(validUntil.getDate() + MEMBERSHIP_VALIDITY_DAYS);

  const membership = await UserMembership.create({
    userId: params.userId,
    planId: plan._id,
    hoursRemaining: plan.hours + carryHours,
    guestPassesRemaining: plan.guestPassesPerPeriod,
    validFrom: now,
    validUntil,
    status: "active",
  });

  return membership;
}

export async function assertMembershipUsable(params: {
  userId: string;
  date: string;
  startTime: number;
  duration: number;
  useGuestPass?: boolean;
}) {
  const membership = await getActiveMembershipForUser(params.userId);
  if (!membership) {
    return { ok: false as const, error: "No active membership" };
  }

  const plan = membership.planId as {
    weekdayOnly?: boolean;
    courtTypes?: string[];
  };

  const slotCheck = canUseMembershipForSlot({
    weekdayOnly: !!plan.weekdayOnly,
    date: params.date,
    startTime: params.startTime,
  });
  if (!slotCheck.ok) {
    return { ok: false as const, error: slotCheck.error };
  }

  if (membership.hoursRemaining < params.duration) {
    return {
      ok: false as const,
      error: "Not enough membership hours for this slot duration",
    };
  }

  if (params.useGuestPass) {
    if (membership.guestPassesRemaining <= 0) {
      return { ok: false as const, error: "No guest passes remaining" };
    }
  }

  return { ok: true as const, membership };
}

export async function deductMembershipForBooking(params: {
  membershipId: string;
  duration: number;
  useGuestPass?: boolean;
}) {
  await connectDB();
  const filter: Record<string, unknown> = {
    _id: params.membershipId,
    status: "active",
    hoursRemaining: { $gte: params.duration },
  };
  const update: Record<string, unknown> = {
    $inc: { hoursRemaining: -params.duration },
  };
  if (params.useGuestPass) {
    filter.guestPassesRemaining = { $gte: 1 };
    (update.$inc as Record<string, number>).guestPassesRemaining = -1;
  }
  const membership = await UserMembership.findOneAndUpdate(filter, update, {
    new: true,
  });
  if (!membership) {
    throw new Error(
      params.useGuestPass
        ? "Insufficient membership hours or guest passes"
        : "Insufficient membership hours",
    );
  }
  return membership;
}

export async function refundMembershipHours(params: {
  membershipId: string;
  hours: number;
  refundGuestPass?: boolean;
}) {
  await connectDB();
  const update: Record<string, unknown> = {
    $inc: {
      hoursRemaining: params.hours,
      ...(params.refundGuestPass ? { guestPassesRemaining: 1 } : {}),
    },
  };
  const membership = await UserMembership.findOneAndUpdate(
    { _id: params.membershipId },
    update,
    { new: true },
  );
  if (!membership) return;
  if (
    membership.validUntil >= new Date() &&
    membership.status !== "cancelled"
  ) {
    membership.status = "active";
    await membership.save();
  }
}
