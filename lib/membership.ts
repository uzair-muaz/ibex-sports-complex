/**
 * Server-only helpers. NOT a "use server" file on purpose: that would turn every
 * export here (e.g. giving points) into an action anyone could call from a browser.
 * The checked actions live in app/actions/.
 */
import connectDB from "@/lib/mongodb";
import MembershipPlan from "@/models/MembershipPlan";
import UserMembership, { type MembershipPaymentMethod } from "@/models/UserMembership";
import MembershipHoursChange from "@/models/MembershipHoursChange";
import { cleanHoursBySport } from "@/lib/membership-plans";
import { MEMBERSHIP_VALIDITY_DAYS } from "@/lib/membership-rules";
import { getAppSettings } from "@/lib/app-settings";

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
  /** What the customer paid, recorded by staff (optional). */
  payment?: { pricePaid: number; method: MembershipPaymentMethod; note?: string } | null;
  /** Staff member who activated it. */
  byUserId?: string | null;
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

  let replaced: typeof existing = null;
  // Unused hours of the same sport carry over (old one-pool hours don't).
  const carry = new Map<string, number>();
  if (existing) {
    const graceEnd = new Date(existing.validUntil);
    graceEnd.setDate(graceEnd.getDate() + (await getAppSettings()).membership.carryOverGraceDays);
    const withinGraceOrActive =
      existing.validUntil >= now || graceEnd >= now;
    if (params.carryForwardHours !== false && withinGraceOrActive) {
      for (const h of existing.hoursBySport ?? []) {
        if (h.remaining > 0) carry.set(h.sport, h.remaining);
      }
    }
    existing.status = "cancelled";
    existing.cancelledAt = now;
    await existing.save();
    replaced = existing;
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
    pricePaid: params.payment?.pricePaid ?? null,
    paymentMethod: params.payment?.method ?? null,
    paymentNote: params.payment?.note ?? "",
    activatedBy: params.byUserId ?? null,
  });

  // History: the plan's hours, then any hours carried over. Never fails the activation.
  const carried = new Map(rows.map((r) => [r.sport, r.total - (base.find((b) => b.sport === r.sport)?.hours ?? 0)]));
  const history = [
    ...(replaced ? [{ type: "cancelled" as const, sport: null, hours: 0, note: `Replaced by ${plan.name}`, membershipId: replaced._id }] : []),
    ...base.map((b) => ({ type: "activated" as const, sport: b.sport, hours: b.hours, note: plan.name })),
    ...[...carried].filter(([, h]) => h > 0).map(([sport, h]) => ({ type: "carried_over" as const, sport, hours: h, note: "Unused hours from the last plan" })),
  ];
  await MembershipHoursChange.insertMany(
    history.map((h) => ({
      membershipId: membership._id,
      ...h,
      userId: params.userId,
      // After the plan's hours, then after the carried hours are added on top.
      remainingAfter:
        h.type === "cancelled" ? null : h.type === "activated" ? h.hours : (rows.find((r) => r.sport === h.sport)?.remaining ?? null),
      byUserId: params.byUserId ?? null,
    })),
  ).catch((err) => console.error("Membership history write failed:", err));

  return membership;
}

// Using and giving back hours lives in lib/membership-hours.ts (per sport, not a "use server" file).
