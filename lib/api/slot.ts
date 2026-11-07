import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Booking from "@/models/Booking";
import Court from "@/models/Court";
import { getAppSettings, type ResolvedAppSettings, type SportRules } from "@/lib/app-settings";
import { getActiveDiscountInputs } from "@/lib/active-discounts";
import { checkAvailabilityRequest, parseSlotStart, priceForSlot, type RateType } from "@/lib/api/availability";
import { overlapsBooking, pakistanNow } from "@/lib/booking-overlap";
import { shiftDateKey } from "@/lib/date-time";
import type { AppliedDiscount, CourtType } from "@/types";

const ACTIVE_STATUSES = ["pending_payment", "confirmed", "completed"];

export type SlotError = { ok: false; status: number; code: string; error: string };

export type ResolvedSlot = {
  ok: true;
  court: { _id: mongoose.Types.ObjectId; name: string; type: CourtType };
  settings: ResolvedAppSettings;
  rules: SportRules;
  dateKey: string;
  startHour: number;
  durationMinutes: number;
  rateType: RateType;
  price: number;
  originalPrice: number;
  discounts: AppliedDiscount[];
};

/**
 * Check a court + start + duration from the app and price it.
 * Same rules as GET /bookings/availability?courtId=…, plus: the start must be
 * in the future and free.
 */
export async function resolveSlot(input: {
  courtId: unknown;
  start: unknown;
  durationMinutes: unknown;
}): Promise<ResolvedSlot | SlotError> {
  if (typeof input.courtId !== "string" || !mongoose.isValidObjectId(input.courtId)) {
    return { ok: false, status: 404, code: "COURT_NOT_FOUND", error: "Court not found" };
  }
  const parsed = parseSlotStart(input.start);
  if (!parsed) {
    return {
      ok: false,
      status: 400,
      code: "VALIDATION_ERROR",
      error: "start must be an ISO time on the hour or half hour, e.g. 2026-11-05T18:00:00+05:00.",
    };
  }
  const durationMinutes = Number(input.durationMinutes);

  await connectDB();
  const court = await Court.findOne({ _id: input.courtId, isActive: true }).lean();
  if (!court) return { ok: false, status: 404, code: "COURT_NOT_FOUND", error: "Court not found" };

  const settings = await getAppSettings();
  const rules = settings.sports.find((s) => s.sport === court.type);
  if (!rules) return { ok: false, status: 404, code: "COURT_NOT_FOUND", error: "Court not found" };

  const now = pakistanNow();
  const check = checkAvailabilityRequest({
    date: parsed.dateKey,
    durationMinutes,
    rules,
    todayKey: now.dateKey,
  });
  if (!check.ok) return { ok: false, status: 400, code: check.code, error: check.error };
  if (parsed.dateKey === now.dateKey && parsed.hour < now.hours) {
    return { ok: false, status: 400, code: "DATE_IN_PAST", error: "This time has already passed." };
  }

  const [bookings, discounts] = await Promise.all([
    Booking.find({
      courtId: court._id,
      date: { $in: [shiftDateKey(parsed.dateKey, -1), parsed.dateKey, shiftDateKey(parsed.dateKey, 1)] },
      status: { $in: ACTIVE_STATUSES },
    })
      .select("date startTime duration")
      .lean(),
    getActiveDiscountInputs(parsed.dateKey),
  ]);

  const taken = bookings.some((b) =>
    overlapsBooking(parsed.dateKey, parsed.hour, durationMinutes / 60, {
      date: b.date,
      startTime: b.startTime,
      duration: b.duration,
    }),
  );
  if (taken) {
    return { ok: false, status: 409, code: "SLOT_UNAVAILABLE", error: "This time is already booked. Please pick another." };
  }

  const typedCourt = court as typeof court & { type: CourtType };
  return {
    ok: true,
    court: { _id: court._id as mongoose.Types.ObjectId, name: court.name, type: typedCourt.type },
    settings,
    rules,
    dateKey: parsed.dateKey,
    startHour: parsed.hour,
    durationMinutes,
    ...priceForSlot(typedCourt, parsed.dateKey, parsed.hour, durationMinutes, discounts),
  };
}
