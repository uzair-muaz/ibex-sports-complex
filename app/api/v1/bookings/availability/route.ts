import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Booking from "@/models/Booking";
import Court from "@/models/Court";
import { apiOk, apiError, apiOptions } from "@/lib/api/response";
import {
  getAvailableStartTimes,
  getQuickSlotCourtAvailability,
  type GetAvailableStartTimesInput,
} from "@/app/actions/bookings";
import { getAppSettings } from "@/lib/app-settings";
import { getActiveDiscountInputs } from "@/lib/active-discounts";
import { buildCourtSlots, checkAvailabilityRequest } from "@/lib/api/availability";
import { pakistanNow } from "@/lib/booking-overlap";
import { shiftDateKey } from "@/lib/date-time";
import type { CourtType } from "@/types";

const ACTIVE_STATUSES = ["pending_payment", "confirmed", "completed"];

/**
 * Mobile: every start time for ONE court.
 * GET ?courtId=&date=YYYY-MM-DD&durationMinutes=90
 */
async function courtAvailability(request: Request, params: URLSearchParams) {
  const courtId = params.get("courtId") || "";
  const date = params.get("date") || "";
  const durationMinutes = Number(params.get("durationMinutes"));

  if (!mongoose.isValidObjectId(courtId)) {
    return apiError("Court not found", 404, request, { code: "COURT_NOT_FOUND" });
  }

  await connectDB();
  const court = await Court.findOne({ _id: courtId, isActive: true }).lean();
  if (!court) return apiError("Court not found", 404, request, { code: "COURT_NOT_FOUND" });

  const settings = await getAppSettings();
  const rules = settings.sports.find((s) => s.sport === court.type);
  if (!rules) return apiError("Court not found", 404, request, { code: "COURT_NOT_FOUND" });

  const now = pakistanNow();
  const check = checkAvailabilityRequest({ date, durationMinutes, rules, todayKey: now.dateKey });
  if (!check.ok) return apiError(check.error, 400, request, { code: check.code });

  const [bookings, discounts] = await Promise.all([
    Booking.find({
      courtId: court._id,
      date: { $in: [shiftDateKey(date, -1), date, shiftDateKey(date, 1)] },
      status: { $in: ACTIVE_STATUSES },
    })
      .select("date startTime duration")
      .lean(),
    getActiveDiscountInputs(date),
  ]);

  const slots = buildCourtSlots({
    court: court as typeof court & { type: CourtType },
    dateKey: date,
    durationMinutes,
    bookings: bookings.map((b) => ({ date: b.date, startTime: b.startTime, duration: b.duration })),
    discounts,
    fromHour: date === now.dateKey ? now.nextStartHour : 0,
  });

  return apiOk(
    { courtId: court._id.toString(), date, durationMinutes, slots },
    request,
    { headers: { "Cache-Control": "no-store" } },
  );
}

/**
 * Public availability.
 * - Mobile, one court: GET ?courtId=&date=&durationMinutes=
 * - Website (unchanged): GET ?courtType=&date=&duration=&mode=times|quick&excludeBookingId=
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  if (searchParams.has("courtId")) {
    try {
      return await courtAvailability(request, searchParams);
    } catch (err) {
      console.error("GET /api/v1/bookings/availability (court):", err);
      return apiError("Could not load free times", 500, request, { code: "SERVER_ERROR" });
    }
  }

  const courtType = searchParams.get("courtType") as
    | GetAvailableStartTimesInput["courtType"]
    | null;
  const date = searchParams.get("date") || "";
  const duration = Number(searchParams.get("duration") || 1);
  const mode = searchParams.get("mode") || "times";
  const excludeBookingId = searchParams.get("excludeBookingId") || undefined;

  if (!courtType || !date) {
    return apiError("courtType and date are required", 400, request);
  }

  const input: GetAvailableStartTimesInput = {
    courtType,
    date,
    duration,
    excludeBookingId,
  };

  if (mode === "quick") {
    const result = await getQuickSlotCourtAvailability(input);
    if (!result.success) {
      return apiError(result.error || "Failed", 400, request);
    }
    return apiOk({ slots: result.slots }, request);
  }

  const result = await getAvailableStartTimes(input);
  if (!result.success) {
    return apiError(result.error || "Failed", 400, request);
  }
  return apiOk({ startTimes: result.startTimes }, request);
}

export async function OPTIONS(request: Request) {
  return apiOptions(request);
}
