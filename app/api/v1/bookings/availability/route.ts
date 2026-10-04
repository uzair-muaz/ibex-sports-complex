import { apiOk, apiError, apiOptions } from "@/lib/api/response";
import {
  getAvailableStartTimes,
  getQuickSlotCourtAvailability,
  type GetAvailableStartTimesInput,
} from "@/app/actions/bookings";

/**
 * Public availability for booking UI + Flutter.
 * GET ?courtType=&date=&duration=&mode=times|quick&excludeBookingId=
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
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