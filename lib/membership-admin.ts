/**
 * Super admin tools for a customer's membership hours bank: add or remove
 * hours, change the end date, cancel, and the history. Server-only (NOT
 * "use server"); the checked routes are in app/api/v1/admin/memberships.
 */
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import UserMembership from "@/models/UserMembership";
import MembershipHoursChange, { type MembershipHoursChangeType } from "@/models/MembershipHoursChange";
import Booking from "@/models/Booking";
import { isSportCode } from "@/lib/sport-rules";
import { toPkIso } from "@/lib/api/time";
import { bookingReference } from "@/lib/api/booking-view";

type Fail = { ok: false; status: number; code: string; error: string };
const bad = (error: string, code = "VALIDATION_ERROR", status = 400): Fail => ({ ok: false, status, code, error });

const MAX_HOURS = 500;

function cleanNote(v: unknown): string | null {
  const note = typeof v === "string" ? v.trim() : "";
  return note.length >= 3 && note.length <= 300 ? note : null;
}

function cleanRequestId(v: unknown): string | null {
  return typeof v === "string" && /^[A-Za-z0-9-]{8,64}$/.test(v) ? v : null;
}

/** Hours must be whole or half hours (bookings are in 30-minute steps). */
export function cleanHoursDelta(v: unknown): number | null {
  if (typeof v !== "number" || !Number.isFinite(v) || v === 0) return null;
  if (Math.abs(v) > MAX_HOURS || Math.round(v * 2) !== v * 2) return null;
  return v;
}

async function loadMembership(id: unknown) {
  if (typeof id !== "string" || !mongoose.isValidObjectId(id)) return null;
  await connectDB();
  return UserMembership.findById(id);
}

function isDuplicate(err: unknown) {
  return (err as { code?: number }).code === 11000;
}

/** Add (+) or remove (−) hours for one sport on a customer's current membership. */
export async function adjustMembershipHours(params: {
  membershipId: unknown;
  sport: unknown;
  hours: unknown;
  note: unknown;
  requestId: unknown;
  staffId: string;
}): Promise<{ ok: true; remaining: number } | Fail> {
  const sport = params.sport;
  if (!isSportCode(sport)) return bad("Choose a sport.");
  const hours = cleanHoursDelta(params.hours);
  if (hours === null) return bad(`Hours must be whole or half hours, from −${MAX_HOURS} to ${MAX_HOURS}, not 0.`);
  const note = cleanNote(params.note);
  if (!note) return bad("Please write a short reason (3–300 characters).");
  const requestId = cleanRequestId(params.requestId);
  if (!requestId) return bad("requestId is missing.");

  const m = await loadMembership(params.membershipId);
  if (!m) return bad("Membership not found", "NOT_FOUND", 404);
  if (m.status !== "active" || m.validUntil < new Date()) {
    return bad("This membership has ended. Change the end date first, or activate a new plan.", "MEMBERSHIP_NOT_ACTIVE", 409);
  }

  const refKey = `staff-hours:${requestId}`;
  if (await MembershipHoursChange.exists({ refKey })) return bad("This change was already saved.", "DUPLICATE", 409);

  // One database step, so two staff changes at once can't go below 0.
  let updated;
  if (hours > 0) {
    const hasSport = m.hoursBySport.some((h) => h.sport === sport);
    updated = hasSport
      ? await UserMembership.findOneAndUpdate(
          { _id: m._id, "hoursBySport.sport": sport },
          { $inc: { "hoursBySport.$.remaining": hours, "hoursBySport.$.total": hours, hoursRemaining: hours } },
          { new: true },
        )
      : await UserMembership.findOneAndUpdate(
          { _id: m._id, "hoursBySport.sport": { $ne: sport } },
          { $push: { hoursBySport: { sport, total: hours, remaining: hours } }, $inc: { hoursRemaining: hours } },
          { new: true },
        );
  } else {
    updated = await UserMembership.findOneAndUpdate(
      { _id: m._id, hoursBySport: { $elemMatch: { sport, remaining: { $gte: -hours } } } },
      { $inc: { "hoursBySport.$.remaining": hours, "hoursBySport.$.total": hours, hoursRemaining: hours } },
      { new: true },
    );
    if (!updated) {
      const left = m.hoursBySport.find((h) => h.sport === sport)?.remaining ?? 0;
      return bad(`Only ${left} hours left for this sport. You can't remove more than that.`, "NOT_ENOUGH_HOURS", 409);
    }
  }
  if (!updated) return bad("Could not change the hours. Please try again.", "CONFLICT", 409);

  const remaining = updated.hoursBySport.find((h) => h.sport === sport)?.remaining ?? 0;
  try {
    await MembershipHoursChange.create({
      userId: m.userId,
      membershipId: m._id,
      type: hours > 0 ? "added" : "removed",
      sport,
      hours,
      remainingAfter: remaining,
      note,
      byUserId: params.staffId,
      refKey,
    });
  } catch (err) {
    if (!isDuplicate(err)) throw err;
    // Same form sent twice at the same moment: undo this copy.
    await UserMembership.updateOne(
      { _id: m._id, "hoursBySport.sport": sport },
      { $inc: { "hoursBySport.$.remaining": -hours, "hoursBySport.$.total": -hours, hoursRemaining: -hours } },
    );
    return bad("This change was already saved.", "DUPLICATE", 409);
  }
  return { ok: true, remaining };
}

/** Move a membership's end date (longer or shorter). An ended plan becomes active again. */
export async function changeMembershipEndDate(params: {
  membershipId: unknown;
  validUntil: unknown;
  note: unknown;
  staffId: string;
}): Promise<{ ok: true; validUntil: string | null } | Fail> {
  const date = typeof params.validUntil === "string" ? new Date(params.validUntil) : null;
  if (!date || Number.isNaN(date.getTime())) return bad("Choose a new end date.");
  if (date <= new Date()) return bad("The new end date must be in the future.");
  const note = cleanNote(params.note);
  if (!note) return bad("Please write a short reason (3–300 characters).");

  const m = await loadMembership(params.membershipId);
  if (!m) return bad("Membership not found", "NOT_FOUND", 404);
  if (m.status === "cancelled") return bad("This membership was cancelled or replaced. Activate a new plan instead.", "MEMBERSHIP_CANCELLED", 409);
  if (date.getTime() < m.validFrom.getTime()) return bad("The end date can't be before the plan started.");

  // Only one plan can be active at a time.
  if (m.status === "expired") {
    const other = await UserMembership.exists({ userId: m.userId, status: "active", _id: { $ne: m._id }, validUntil: { $gte: new Date() } });
    if (other) return bad("This customer already has another active plan.", "OTHER_PLAN_ACTIVE", 409);
  }

  m.validUntil = date;
  m.status = "active";
  await m.save();
  await MembershipHoursChange.create({
    userId: m.userId,
    membershipId: m._id,
    type: "extended",
    hours: 0,
    validUntil: date,
    note,
    byUserId: params.staffId,
  });
  return { ok: true, validUntil: toPkIso(date) };
}

/** Stop a membership now. Hours left can't be used any more; bookings already made stay. */
export async function cancelMembership(params: {
  membershipId: unknown;
  note: unknown;
  staffId: string;
}): Promise<{ ok: true } | Fail> {
  const note = cleanNote(params.note);
  if (!note) return bad("Please write a short reason (3–300 characters).");
  const m = await loadMembership(params.membershipId);
  if (!m) return bad("Membership not found", "NOT_FOUND", 404);
  if (m.status === "cancelled") return bad("This membership is already cancelled.", "MEMBERSHIP_CANCELLED", 409);

  m.status = "cancelled";
  m.cancelledAt = new Date();
  await m.save();
  await MembershipHoursChange.create({
    userId: m.userId,
    membershipId: m._id,
    type: "cancelled",
    hours: 0,
    note,
    byUserId: params.staffId,
  });
  return { ok: true };
}

export type HoursHistoryType = MembershipHoursChangeType | "used" | "returned";

export type HoursHistoryItem = {
  id: string;
  type: HoursHistoryType;
  sport: string | null;
  /** Signed: + added to the bank, − taken from it. */
  hours: number;
  remainingAfter: number | null;
  validUntil: string | null;
  note: string;
  by: string | null;
  bookingId: string | null;
  bookingRef: string | null;
  date: string | null;
};

type ChangeRow = {
  _id: mongoose.Types.ObjectId;
  type: MembershipHoursChangeType;
  sport?: string | null;
  hours: number;
  remainingAfter?: number | null;
  validUntil?: Date | null;
  note?: string;
  byUserId?: { name?: string } | null;
  createdAt: Date;
};

type BookingRow = {
  _id: mongoose.Types.ObjectId;
  serialNumber?: number | null;
  date: string;
  startTime: number;
  duration: number;
  membershipHoursUsed?: number;
  membershipSport?: string;
  membershipHoursReturnedAt?: Date;
  createdAt: Date;
};

/** Pure: staff changes + bookings → one list, newest first. */
export function mergeHoursHistory(changes: ChangeRow[], bookings: BookingRow[]): HoursHistoryItem[] {
  const items: (HoursHistoryItem & { at: number })[] = [];
  for (const c of changes) {
    items.push({
      id: c._id.toString(),
      type: c.type,
      sport: c.sport ?? null,
      hours: c.hours,
      remainingAfter: c.remainingAfter ?? null,
      validUntil: c.validUntil ? toPkIso(c.validUntil) : null,
      note: c.note ?? "",
      by: c.byUserId?.name ?? null,
      bookingId: null,
      bookingRef: null,
      date: toPkIso(c.createdAt),
      at: c.createdAt.getTime(),
    });
  }
  for (const b of bookings) {
    const hours = b.membershipHoursUsed || b.duration;
    const ref = bookingReference(b);
    const slot = `${b.date} at ${String(Math.floor(b.startTime)).padStart(2, "0")}:${b.startTime % 1 ? "30" : "00"}`;
    const base = { sport: b.membershipSport ?? null, remainingAfter: null, validUntil: null, by: null, bookingId: b._id.toString(), bookingRef: ref };
    items.push({ ...base, id: `used:${b._id}`, type: "used", hours: -hours, note: `Booking ${slot}`, date: toPkIso(b.createdAt), at: b.createdAt.getTime() });
    if (b.membershipHoursReturnedAt) {
      items.push({
        ...base,
        id: `returned:${b._id}`,
        type: "returned",
        hours,
        note: `Booking ${slot} cancelled`,
        date: toPkIso(b.membershipHoursReturnedAt),
        at: b.membershipHoursReturnedAt.getTime(),
      });
    }
  }
  items.sort((a, b) => b.at - a.at);
  return items.map((i) => {
    const item: Partial<typeof i> = { ...i };
    delete item.at;
    return item as HoursHistoryItem;
  });
}

/** A customer's memberships (newest first) and the hours history. */
export async function membershipHoursHistory(userId: string) {
  await connectDB();
  const [memberships, changes, bookings] = await Promise.all([
    UserMembership.find({ userId })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate("planId", "name")
      .populate("activatedBy", "name")
      .lean(),
    MembershipHoursChange.find({ userId }).sort({ createdAt: -1 }).limit(300).populate("byUserId", "name").lean(),
    Booking.find({ userId, usedMembershipHours: true })
      .sort({ createdAt: -1 })
      .limit(300)
      .select("serialNumber date startTime duration membershipHoursUsed membershipSport membershipHoursReturnedAt createdAt")
      .lean(),
  ]);
  const now = Date.now();
  return {
    memberships: memberships.map((m) => ({
      id: m._id.toString(),
      planName: (m.planId as unknown as { name?: string } | null)?.name ?? "Plan",
      status: m.status === "active" && m.validUntil.getTime() < now ? "expired" : m.status,
      validFrom: toPkIso(m.validFrom),
      validUntil: toPkIso(m.validUntil),
      hoursBySport: (m.hoursBySport ?? []).map((h) => ({
        sport: h.sport,
        total: h.total,
        used: Math.max(0, Math.round((h.total - h.remaining) * 100) / 100),
        remaining: h.remaining,
      })),
      pricePaid: m.pricePaid ?? null,
      paymentMethod: m.paymentMethod ?? null,
      paymentNote: m.paymentNote ?? "",
      activatedBy: (m.activatedBy as unknown as { name?: string } | null)?.name ?? null,
      cancelledAt: m.cancelledAt ? toPkIso(m.cancelledAt) : null,
    })),
    history: mergeHoursHistory(changes as unknown as ChangeRow[], bookings as unknown as BookingRow[]),
  };
}
