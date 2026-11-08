import { calculateOriginalPrice, getBookingStartPricingLabel, type CourtLike } from "@/lib/pricing-utils";
import {
  calculateDiscountedPrice,
  getApplicableDiscounts,
  type DiscountInput,
} from "@/lib/discount-utils";
import { overlapsBooking, type BookingSpan } from "@/lib/booking-overlap";
import { shiftDateKey } from "@/lib/date-time";
import { roundPkr } from "@/lib/api/catalog";
import type { SportRules } from "@/lib/app-settings";
import type { AppliedDiscount, CourtType } from "@/types";

export type RateType = "off_peak" | "standard" | "peak";

export type CourtSlot = {
  start: string;
  available: boolean;
  rateType: RateType;
  /** Full price for the chosen duration after automatic discounts, whole PKR. */
  price: number;
  /** Price before automatic discounts, whole PKR. Same as price when none apply. */
  originalPrice: number;
};

/** "2026-11-05" + 17.5 → "2026-11-05T17:30:00+05:00". */
export function slotStartIso(dateKey: string, hour: number): string {
  const totalMinutes = Math.round(hour * 60);
  const hh = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
  const mm = String(totalMinutes % 60).padStart(2, "0");
  return `${dateKey}T${hh}:${mm}:00+05:00`;
}

export type AvailabilityErrorCode =
  | "VALIDATION_ERROR"
  | "DATE_IN_PAST"
  | "DATE_OUT_OF_WINDOW"
  | "INVALID_DURATION";

function isRealDate(key: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return false;
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/**
 * Check date and duration for one court.
 * The window counts today: bookingWindowDays 14 → today and the next 13 days.
 */
export function checkAvailabilityRequest(input: {
  date: string;
  durationMinutes: number;
  rules: Pick<SportRules, "durationsMinutes" | "bookingWindowDays">;
  todayKey: string;
}): { ok: true } | { ok: false; code: AvailabilityErrorCode; error: string } {
  if (!isRealDate(input.date)) {
    return { ok: false, code: "VALIDATION_ERROR", error: "date must be YYYY-MM-DD." };
  }
  if (input.date < input.todayKey) {
    return { ok: false, code: "DATE_IN_PAST", error: "This date has already passed." };
  }
  const lastDay = shiftDateKey(input.todayKey, input.rules.bookingWindowDays - 1);
  if (input.date > lastDay) {
    return {
      ok: false,
      code: "DATE_OUT_OF_WINDOW",
      error: `You can book up to ${input.rules.bookingWindowDays} days ahead.`,
    };
  }
  if (!Number.isInteger(input.durationMinutes) || !input.rules.durationsMinutes.includes(input.durationMinutes)) {
    return {
      ok: false,
      code: "INVALID_DURATION",
      error: `Choose one of: ${input.rules.durationsMinutes.join(", ")} minutes.`,
    };
  }
  return { ok: true };
}

/** Price of one start time for a duration, after automatic discounts. Whole PKR. */
export function priceForSlot(
  court: CourtLike & { type: CourtType },
  dateKey: string,
  startHour: number,
  durationMinutes: number,
  discounts: DiscountInput[],
): { rateType: RateType; price: number; originalPrice: number; discounts: AppliedDiscount[] } {
  const duration = durationMinutes / 60;
  const { originalPrice } = calculateOriginalPrice(court, startHour, duration, dateKey);
  const applicable = getApplicableDiscounts(discounts, {
    courtType: court.type,
    court,
    duration,
    startTime: startHour,
    date: dateKey,
  });
  const { finalPrice, appliedDiscounts } = calculateDiscountedPrice(originalPrice, applicable, {
    court,
    startTime: startHour,
    duration,
    date: dateKey,
  });
  return {
    rateType: getBookingStartPricingLabel(court, startHour) ?? "standard",
    price: roundPkr(finalPrice),
    originalPrice: roundPkr(originalPrice),
    discounts: appliedDiscounts,
  };
}

/** "2026-11-05T18:00:00+05:00" (any offset) → venue date and start hour. Must be on a half hour. */
export function parseSlotStart(start: unknown): { dateKey: string; hour: number } | null {
  if (typeof start !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/.test(start)) {
    return null;
  }
  const ms = Date.parse(start);
  if (Number.isNaN(ms)) return null;
  const pk = new Date(ms + 5 * 60 * 60_000);
  if (pk.getUTCSeconds() !== 0 || pk.getUTCMilliseconds() !== 0) return null;
  const minutes = pk.getUTCHours() * 60 + pk.getUTCMinutes();
  if (minutes % 30 !== 0) return null;
  return { dateKey: pk.toISOString().slice(0, 10), hour: minutes / 60 };
}

/**
 * Every half-hour start (courts are open 24 hours) for one court and day,
 * free or taken, with its price. Starts before `fromHour` (already past) are left out.
 * `bookings` must include the day before and after (games can cross midnight).
 */
export function buildCourtSlots(input: {
  court: CourtLike & { type: CourtType };
  dateKey: string;
  durationMinutes: number;
  bookings: BookingSpan[];
  discounts: DiscountInput[];
  fromHour?: number;
}): CourtSlot[] {
  const duration = input.durationMinutes / 60;
  const slots: CourtSlot[] = [];
  for (let i = 0; i < 48; i++) {
    const start = i * 0.5;
    if (start < (input.fromHour ?? 0)) continue;

    const available = !input.bookings.some((b) => overlapsBooking(input.dateKey, start, duration, b));
    const { rateType, price, originalPrice } = priceForSlot(
      input.court,
      input.dateKey,
      start,
      input.durationMinutes,
      input.discounts,
    );
    slots.push({ start: slotStartIso(input.dateKey, start), available, rateType, price, originalPrice });
  }
  return slots;
}
