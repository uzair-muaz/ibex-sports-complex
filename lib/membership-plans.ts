import connectDB from "@/lib/mongodb";
import MembershipPlan from "@/models/MembershipPlan";
import UserMembership from "@/models/UserMembership";
import { getAppSettings } from "@/lib/app-settings";
import { hoursBySportView, type SportHours } from "@/lib/membership-hours";
import { toPkIso } from "@/lib/api/time";

/** Membership plans and "my membership" for the app (Phase 12). Not a "use server" file. */

export const PLAN_SPORTS = ["PADEL", "PICKLEBALL", "FUTSAL", "CRICKET"] as const;
type PlanSport = (typeof PLAN_SPORTS)[number];

/** Keep only real sports with hours > 0, in half hours, one row per sport. */
export function cleanHoursBySport(rows: unknown): { sport: PlanSport; hours: number }[] {
  if (!Array.isArray(rows)) return [];
  const out = new Map<PlanSport, number>();
  for (const r of rows) {
    const sport = (r as { sport?: unknown })?.sport;
    const hours = Number((r as { hours?: unknown })?.hours);
    if (!PLAN_SPORTS.includes(sport as PlanSport)) continue;
    if (!Number.isFinite(hours) || hours <= 0 || hours > 1000) continue;
    out.set(sport as PlanSport, Math.round(hours * 2) / 2);
  }
  return PLAN_SPORTS.filter((s) => out.has(s)).map((sport) => ({ sport, hours: out.get(sport)! }));
}

/** "+92 325 5429429" → "https://wa.me/923255429429" */
export function whatsAppUrlFor(phone: string | null | undefined): string | null {
  const digits = String(phone ?? "").replace(/\D/g, "");
  return digits.length >= 10 ? `https://wa.me/${digits}` : null;
}

type PlanRow = {
  _id: { toString(): string };
  slug: string;
  name: string;
  price: number;
  hoursBySport?: { sport: string; hours: number }[];
  validityDays?: number;
  badge?: string | null;
  features?: string[];
  weekdayOnly?: boolean;
  isActive?: boolean;
  sortOrder?: number;
};

export function toPublicPlan(p: PlanRow) {
  return {
    id: p.slug,
    name: p.name,
    price: Math.round(p.price),
    validityDays: p.validityDays || 30,
    badge: p.badge || null,
    hours: (p.hoursBySport ?? []).map((h) => ({ sport: h.sport, hours: h.hours })),
    features: p.features ?? [],
    restriction: p.weekdayOnly ? "Weekdays only (Mon–Fri)" : null,
  };
}

/** Public: plans on sale (ones with hours per sport set), and the WhatsApp link to buy. */
export async function listPublicPlans() {
  await connectDB();
  const [plans, settings] = await Promise.all([
    MembershipPlan.find({ isActive: true, "hoursBySport.0": { $exists: true } }).sort({ sortOrder: 1 }).lean(),
    getAppSettings(),
  ]);
  return {
    plans: (plans as unknown as PlanRow[]).map(toPublicPlan),
    whatsAppUrl: whatsAppUrlFor(settings.venue.whatsApp),
  };
}

/** The app's "my membership": active plan and hours per sport, or null. */
export async function buildAppMembership(userId: string) {
  await connectDB();
  const m = await UserMembership.findOne({ userId, status: "active", validUntil: { $gte: new Date() } })
    .sort({ validUntil: -1 })
    .populate("planId", "name slug weekdayOnly")
    .lean();
  if (!m) return { active: null };
  const plan = (m.planId ?? {}) as { name?: string; slug?: string; weekdayOnly?: boolean };
  return {
    active: {
      planId: plan.slug ?? null,
      planName: plan.name || "Membership",
      startedAt: toPkIso(m.validFrom),
      expiresAt: toPkIso(m.validUntil),
      restriction: plan.weekdayOnly ? "Weekdays only (Mon–Fri)" : null,
      hoursBySport: hoursBySportView((m.hoursBySport ?? []) as SportHours[]),
    },
  };
}

export type PlanInput = {
  name: string;
  slug: string;
  price: number;
  validityDays: number;
  weekdayOnly: boolean;
  hoursBySport: { sport: PlanSport; hours: number }[];
  badge: string | null;
  features: string[];
  isActive: boolean;
  sortOrder: number;
};

/** Check a plan from the super admin's form. `partial` for edits. */
export function validatePlanInput(
  body: unknown,
  partial: boolean,
): { ok: true; value: Partial<PlanInput> } | { ok: false; error: string } {
  if (!body || typeof body !== "object") return { ok: false, error: "Invalid body" };
  const b = body as Record<string, unknown>;
  const v: Partial<PlanInput> = {};
  const has = (k: string) => b[k] !== undefined;

  if (has("name") || !partial) {
    const name = typeof b.name === "string" ? b.name.trim() : "";
    if (name.length < 2 || name.length > 40) return { ok: false, error: "Plan name must be 2–40 characters." };
    v.name = name;
    if (!partial) {
      v.slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "plan";
    }
  }
  if (has("price") || !partial) {
    const price = Number(b.price);
    if (!Number.isFinite(price) || price < 0 || price > 10_000_000) return { ok: false, error: "Enter a price in PKR." };
    v.price = Math.round(price);
  }
  if (has("validityDays") || !partial) {
    const d = b.validityDays === undefined ? 30 : Number(b.validityDays);
    if (!Number.isInteger(d) || d < 1 || d > 366) return { ok: false, error: "Days until it expires must be 1–366." };
    v.validityDays = d;
  }
  if (has("hoursBySport") || !partial) {
    const hours = cleanHoursBySport(b.hoursBySport);
    if (hours.length === 0) return { ok: false, error: "Give at least one sport some hours." };
    v.hoursBySport = hours;
  }
  if (has("weekdayOnly")) v.weekdayOnly = b.weekdayOnly === true;
  if (has("isActive")) v.isActive = b.isActive !== false;
  if (has("badge")) {
    const badge = typeof b.badge === "string" ? b.badge.trim().slice(0, 30) : "";
    v.badge = badge || null;
  }
  if (has("features")) {
    if (!Array.isArray(b.features)) return { ok: false, error: "features must be a list." };
    v.features = b.features
      .filter((f): f is string => typeof f === "string")
      .map((f) => f.trim().slice(0, 80))
      .filter(Boolean)
      .slice(0, 8);
  }
  if (has("sortOrder")) {
    const n = Number(b.sortOrder);
    if (Number.isFinite(n)) v.sortOrder = Math.round(n);
  }
  return { ok: true, value: v };
}

/** Super admin list: every plan, with the old single-pool hours for reference. */
export async function listAdminPlans() {
  await connectDB();
  const plans = await MembershipPlan.find({}).sort({ sortOrder: 1, createdAt: 1 }).lean();
  return (plans as unknown as (PlanRow & { hours?: number })[]).map((p) => ({
    _id: p._id.toString(),
    slug: p.slug,
    name: p.name,
    price: p.price,
    validityDays: p.validityDays || 30,
    weekdayOnly: !!p.weekdayOnly,
    hoursBySport: p.hoursBySport ?? [],
    oldPoolHours: p.hours ?? 0,
    badge: p.badge ?? null,
    features: p.features ?? [],
    isActive: p.isActive !== false,
    sortOrder: p.sortOrder ?? 0,
  }));
}

export async function createPlan(v: Partial<PlanInput>) {
  await connectDB();
  let slug = v.slug || "plan";
  for (let i = 2; await MembershipPlan.exists({ slug }); i++) slug = `${v.slug}-${i}`;
  const hours = (v.hoursBySport ?? []).reduce((s, h) => s + h.hours, 0);
  const plan = await MembershipPlan.create({
    ...v,
    slug,
    hours,
    guestPassesPerPeriod: 0,
    isActive: v.isActive ?? true,
    sortOrder: v.sortOrder ?? 0,
  });
  return plan.toObject();
}

export async function updatePlan(id: string, v: Partial<PlanInput>) {
  await connectDB();
  const set: Record<string, unknown> = { ...v };
  delete set.slug; // the slug is the plan's id in the app; it never changes
  if (v.hoursBySport) set.hours = v.hoursBySport.reduce((s, h) => s + h.hours, 0);
  return MembershipPlan.findByIdAndUpdate(id, { $set: set }, { new: true }).lean();
}
