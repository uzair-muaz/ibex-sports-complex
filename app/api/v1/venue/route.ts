import { apiOk, apiError, apiOptions } from "@/lib/api/response";
import { getAppSettings } from "@/lib/app-settings";

/** Venue details and contacts (edited by the super admin in Admin → App settings). */
export async function GET(request: Request) {
  try {
    const { venue } = await getAppSettings();
    return apiOk(venue, request, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
    });
  } catch (err) {
    console.error("GET /api/v1/venue:", err);
    return apiError("Could not load venue", 500, request, { code: "SERVER_ERROR" });
  }
}

export async function OPTIONS(request: Request) {
  return apiOptions(request);
}
