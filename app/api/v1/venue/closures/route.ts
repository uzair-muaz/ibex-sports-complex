import { apiOk, apiError, apiOptions } from "@/lib/api/response";
import { upcomingClosures } from "@/lib/closure-admin";

/** Public: closures in the next 30 days, so the app and website can show "Closed" notes. */
export async function GET(request: Request) {
  try {
    return apiOk({ items: await upcomingClosures(30) }, request, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
    });
  } catch (err) {
    console.error("GET /api/v1/venue/closures:", err);
    return apiError("Could not load closures", 500, request, { code: "SERVER_ERROR" });
  }
}

export async function OPTIONS(request: Request) {
  return apiOptions(request);
}
