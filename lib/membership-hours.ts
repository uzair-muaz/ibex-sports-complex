import { BUILT_IN_SPORTS } from "@/lib/sport-rules";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Booking from "@/models/Booking";
import UserMembership from "@/models/UserMembership";
import "@/models/MembershipPlan";
import { bookingStartMs } from "@/lib/api/booking-view";
import { isWeekendDateKey } from "@/lib/membership-rules";
import { DEFAULT_APP_SETTINGS, getAppSettings, type MembershipRules } from "@/lib/app-settings";

/**
 * Membership hours per sport (Phase 12). Used by the website checkout, the
 * app quote and app booking, and every cancel path. Not a "use server" file,
 * so nothing here can be called straight from a browser.
 */

export const MEMBERSHIP_SPORTS = BUILT_IN_SPORTS;
export type MembershipSport = string;

export type SportHours = { sport: string; total: number; remaining: number };

export { HOURS_REASON_TEXT, floorHalf, hoursCover, type HoursReasonCode } from "@/lib/membership-hours-rules";
import { floorHalf, type HoursReasonCode } from "@/lib/membership-hours-rules";

/** The membership facts the hours check needs. */
export type MembershipForHours = {
  id: string;
  planName: string;
  weekdayOnly: boolean;
  validUntil: Date;
  hoursBySport: SportHours[];
  /** Notice rules from App Settings (defaults if missing). */
  rules?: Pick<MembershipRules, "weekdayAdvanceHours" | "weekendAdvanceHours">;
};

export type HoursCheck = {
  /** Hours left for this sport (0 if none). */
  available: number;
  canUse: boolean;
  reasonCode: HoursReasonCode | null;
};

/** Can this membership pay for this slot? Pure. */
export function checkHoursForSlot(
  m: MembershipForHours | null,
  slot: { sport: string; dateKey: string; startHour: number },
  now = Date.now(),
): HoursCheck {
  if (!m) return { available: 0, canUse: false, reasonCode: "NO_MEMBERSHIP" };
  const row = m.hoursBySport.find((h) => h.sport === slot.sport);
  const available = row ? Math.max(0, row.remaining) : 0;
  const no = (reasonCode: HoursReasonCode) => ({ available, canUse: false, reasonCode });
  if (!row) return no("SPORT_NOT_INCLUDED");
  if (floorHalf(available) <= 0) return no("NO_HOURS_LEFT");
  if (m.weekdayOnly && isWeekendDateKey(slot.dateKey)) return no("WEEKDAYS_ONLY");
  const startMs = bookingStartMs(slot.dateKey, slot.startHour);
  if (startMs > m.validUntil.getTime()) return no("EXPIRES_BEFORE_BOOKING");
  const rules = m.rules ?? DEFAULT_APP_SETTINGS.membership;
  const needHours = isWeekendDateKey(slot.dateKey) ? rules.weekendAdvanceHours : rules.weekdayAdvanceHours;
  if (startMs - now < needHours * 3_600_000) return no("TOO_SOON");
  return { available, canUse: true, reasonCode: null };
}

/** For screens: total / used / remaining per sport. */
export function hoursBySportView(rows: SportHours[]) {
  return rows.map((h) => ({
    sport: h.sport,
    total: h.total,
    used: Math.max(0, Math.round((h.total - h.remaining) * 100) / 100),
    remaining: h.remaining,
  }));
}

/** The customer's active membership, in the shape the hours check needs. */
export async function loadMembershipForHours(userId: string): Promise<MembershipForHours | null> {
  await connectDB();
  const [m, settings] = await Promise.all([
    UserMembership.findOne({ userId, status: "active", validUntil: { $gte: new Date() } })
      .sort({ validUntil: -1 })
      .populate("planId", "name weekdayOnly")
      .lean(),
    getAppSettings(),
  ]);
  if (!m) return null;
  const plan = (m.planId ?? {}) as { name?: string; weekdayOnly?: boolean };
  return {
    id: m._id.toString(),
    planName: plan.name || "Membership",
    weekdayOnly: !!plan.weekdayOnly,
    validUntil: new Date(m.validUntil),
    hoursBySport: (m.hoursBySport ?? []) as SportHours[],
    rules: settings.membership,
  };
}

/** Take hours from one sport. One database step; false if they're not there any more. */
export async function takeSportHours(params: { membershipId: string; sport: string; hours: number }): Promise<boolean> {
  if (params.hours <= 0) return true;
  const res = await UserMembership.findOneAndUpdate(
    {
      _id: params.membershipId,
      status: "active",
      validUntil: { $gte: new Date() },
      hoursBySport: { $elemMatch: { sport: params.sport, remaining: { $gte: params.hours } } },
    },
    { $inc: { "hoursBySport.$.remaining": -params.hours, hoursRemaining: -params.hours } },
    { new: true },
  );
  return !!res;
}

/** Undo takeSportHours when a booking could not be saved. */
export async function putBackSportHours(params: { membershipId: string; sport: string; hours: number }) {
  if (params.hours <= 0) return;
  await UserMembership.updateOne(
    { _id: params.membershipId, "hoursBySport.sport": params.sport },
    { $inc: { "hoursBySport.$.remaining": params.hours, hoursRemaining: params.hours } },
  );
}

/**
 * Give a cancelled booking's hours back. Safe to call more than once: the
 * booking is marked first, and only the call that marks it gives hours back.
 * Old bookings (no sport saved) go back to the old single pool.
 */
export async function returnHoursForBooking(bookingId: string | mongoose.Types.ObjectId): Promise<number> {
  await connectDB();
  const b = await Booking.findOneAndUpdate(
    {
      _id: bookingId,
      usedMembershipHours: true,
      membershipId: { $exists: true, $ne: null },
      membershipHoursReturnedAt: { $exists: false },
    },
    { $set: { membershipHoursReturnedAt: new Date() } },
    { new: true },
  )
    .select("membershipId membershipHoursUsed membershipSport duration usedGuestPass")
    .lean();
  if (!b || !b.membershipId) return 0;
  const hours = b.membershipHoursUsed || b.duration;
  const inc: Record<string, number> = { hoursRemaining: hours };
  if (b.usedGuestPass) inc.guestPassesRemaining = 1;
  const filter: Record<string, unknown> = { _id: b.membershipId };
  if (b.membershipSport) {
    filter["hoursBySport.sport"] = b.membershipSport;
    inc["hoursBySport.$.remaining"] = hours;
  }
  const m = await UserMembership.findOneAndUpdate(filter, { $inc: inc }, { new: true });
  if (m && m.status === "expired" && m.validUntil >= new Date()) {
    m.status = "active";
    await m.save();
  }
  return hours;
}
