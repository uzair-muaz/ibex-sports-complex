/**
 * Server-only helpers. NOT a "use server" file on purpose: that would turn every
 * export here (e.g. giving points) into an action anyone could call from a browser.
 * The checked actions live in app/actions/.
 */
import connectDB from "@/lib/mongodb";
import MembershipPlan from "@/models/MembershipPlan";
import UserMembership from "@/models/UserMembership";
import { cleanHoursBySport } from "@/lib/membership-plans";
import {
  MEMBERSHIP_LAPSE_GRACE_DAYS,
  MEMBERSHIP_PLAN_SEEDS,
  MEMBERSHIP_VALIDITY_DAYS,
} from "@/lib/membership-rules";

export async function ensureMembershipPlansSeeded() {
  await connectDB();
  // Only fill an empty list. Plans are made and edited by the super admin
  // (Admin → Memberships → Plans), so a deleted plan never comes back.
  if ((await MembershipPlan.estimatedDocumentCount()) > 0) return;
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
  /** Staff can change the hours per sport for this customer (defaults to the plan's). */
  hoursBySport?: { sport: string; hours: number }[];
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

  const base = cleanHoursBySport(params.hoursBySport ?? plan.hoursBySport ?? []);
  if (base.length === 0) {
    throw new Error("This plan has no hours per sport yet. Set them in Plans first.");
  }

  // Unused hours of the same sport carry over (old one-pool hours don't).
  const carry = new Map<string, number>();
  if (existing) {
    const graceEnd = new Date(existing.validUntil);
    graceEnd.setDate(graceEnd.getDate() + MEMBERSHIP_LAPSE_GRACE_DAYS);
    const withinGraceOrActive =
      existing.validUntil >= now || graceEnd >= now;
    if (params.carryForwardHours !== false && withinGraceOrActive) {
      for (const h of existing.hoursBySport ?? []) {
        if (h.remaining > 0) carry.set(h.sport, h.remaining);
      }
    }
    existing.status = "cancelled";
    await existing.save();
  }

  const rows: { sport: string; total: number; remaining: number }[] = base.map((h) => {
    const total = h.hours + (carry.get(h.sport) ?? 0);
    carry.delete(h.sport);
    return { sport: h.sport, total, remaining: total };
  });
  for (const [sport, remaining] of carry) rows.push({ sport, total: remaining, remaining });

  const validUntil = new Date(now);
  validUntil.setDate(validUntil.getDate() + (plan.validityDays || MEMBERSHIP_VALIDITY_DAYS));

  const membership = await UserMembership.create({
    userId: params.userId,
    planId: plan._id,
    hoursBySport: rows,
    hoursRemaining: rows.reduce((sum, r) => sum + r.remaining, 0),
    guestPassesRemaining: 0,
    validFrom: now,
    validUntil,
    status: "active",
  });

  return membership;
}

// Using and giving back hours lives in lib/membership-hours.ts (per sport, not a "use server" file).
