import { apiOk, apiError, apiOptions } from "@/lib/api/response";
import { getAppSettings } from "@/lib/app-settings";

/** General booking rules. cancellationNoticeMinutes: customers can cancel until this many minutes before start. */
export async function GET(request: Request) {
  try {
    const { cancellationNoticeMinutes } = await getAppSettings();
    return apiOk({ cancellationNoticeMinutes }, request, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
    });
  } catch (err) {
    console.error("GET /api/v1/booking-policy:", err);
    return apiError("Could not load booking policy", 500, request, { code: "SERVER_ERROR" });
  }
}

export async function OPTIONS(request: Request) {
  return apiOptions(request);
}
