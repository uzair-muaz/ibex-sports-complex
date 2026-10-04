import type { CourtType } from "@/types";

export const MEMBERSHIP_VALIDITY_DAYS = 30;
export const MEMBERSHIP_LAPSE_GRACE_DAYS = 7;
export const MEMBERSHIP_WEEKDAY_ADVANCE_HOURS = 2;
export const MEMBERSHIP_WEEKEND_ADVANCE_HOURS = 24;
export const CUSTOMER_CANCEL_MIN_HOURS_BEFORE_START = 4;

export type MembershipPlanSeed = {
  slug: string;
  name: string;
  price: number;
  hours: number;
  weekdayOnly: boolean;
  guestPassesPerPeriod: number;
  priorityBadge: boolean;
  courtTypes: CourtType[];
  sortOrder: number;
};

export const MEMBERSHIP_PLAN_SEEDS: MembershipPlanSeed[] = [
  {
    slug: "bronze",
    name: "Bronze",
    price: 52500,
    hours: 15,
    weekdayOnly: true,
    guestPassesPerPeriod: 0,
    priorityBadge: false,
    courtTypes: ["PADEL", "CRICKET", "PICKLEBALL", "FUTSAL"],
    sortOrder: 1,
  },
  {
    slug: "silver",
    name: "Silver",
    price: 76800,
    hours: 24,
    weekdayOnly: false,
    guestPassesPerPeriod: 0,
    priorityBadge: true,
    courtTypes: ["PADEL", "CRICKET", "PICKLEBALL", "FUTSAL"],
    sortOrder: 2,
  },
  {
    slug: "gold",
    name: "Gold",
    price: 96000,
    hours: 32,
    weekdayOnly: false,
    guestPassesPerPeriod: 2,
    priorityBadge: true,
    courtTypes: ["PADEL", "CRICKET", "PICKLEBALL", "FUTSAL"],
    sortOrder: 3,
  },
  {
    slug: "platinum",
    name: "Platinum",
    price: 112000,
    hours: 40,
    weekdayOnly: false,
    guestPassesPerPeriod: 4,
    priorityBadge: true,
    courtTypes: ["PADEL", "CRICKET", "PICKLEBALL", "FUTSAL"],
    sortOrder: 4,
  },
];

/** Local calendar day-of-week from YYYY-MM-DD (0=Sun … 6=Sat). */
export function dayOfWeekFromDateKey(dateKey: string): number {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, d).getDay();
}

export function isWeekendDateKey(dateKey: string): boolean {
  const dow = dayOfWeekFromDateKey(dateKey);
  return dow === 0 || dow === 6;
}

export function isWeekdayDateKey(dateKey: string): boolean {
  return !isWeekendDateKey(dateKey);
}

/** Hours until slot start from `now`. */
export function hoursUntilSlotStart(
  dateKey: string,
  startTime: number,
  now: Date = new Date(),
): number {
  const [y, m, d] = dateKey.split("-").map(Number);
  const hour = Math.floor(startTime);
  const minutes = Math.round((startTime - hour) * 60);
  const start = new Date(y, m - 1, d, hour, minutes, 0, 0);
  return (start.getTime() - now.getTime()) / (1000 * 60 * 60);
}

export function customerCanCancelBooking(params: {
  status: string;
  date: string;
  startTime: number;
  now?: Date;
}): boolean {
  if (params.status !== "pending_payment" && params.status !== "confirmed") {
    return false;
  }
  return (
    hoursUntilSlotStart(params.date, params.startTime, params.now) >=
    CUSTOMER_CANCEL_MIN_HOURS_BEFORE_START
  );
}

export function membershipAdvanceHoursRequired(dateKey: string): number {
  return isWeekendDateKey(dateKey)
    ? MEMBERSHIP_WEEKEND_ADVANCE_HOURS
    : MEMBERSHIP_WEEKDAY_ADVANCE_HOURS;
}

export function canUseMembershipForSlot(params: {
  weekdayOnly: boolean;
  date: string;
  startTime: number;
  now?: Date;
}): { ok: boolean; error?: string } {
  if (params.weekdayOnly && !isWeekdayDateKey(params.date)) {
    return {
      ok: false,
      error: "This membership can only be used on weekdays (Mon–Fri).",
    };
  }
  const required = membershipAdvanceHoursRequired(params.date);
  const hoursAhead = hoursUntilSlotStart(
    params.date,
    params.startTime,
    params.now,
  );
  if (hoursAhead < required) {
    return {
      ok: false,
      error: `Membership bookings require at least ${required} hours advance notice for this day.`,
    };
  }
  return { ok: true };
}
