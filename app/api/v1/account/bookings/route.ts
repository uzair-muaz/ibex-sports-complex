import { requireBffCustomer, bffOk, bffError } from "@/lib/bff/http";
import { getMyBookings } from "@/app/actions/customer-bookings";
import { createTrustedApiActor } from "@/lib/action-auth";
import { apiError, apiOk } from "@/lib/api/response";
import { listMyAppBookings } from "@/lib/api/my-bookings";

/**
 * My bookings.
 * - App: `?format=app[&cursor=&limit=]` → { upcoming: [Booking], past: { items, nextCursor } }.
 * - Website (no format): unchanged raw lists.
 */
export async function GET(request: Request) {
  const gate = await requireBffCustomer(request);
  if (!gate.ok) return gate.response;

  const url = new URL(request.url);
  if (url.searchParams.get("format") === "app") {
    const limitParam = url.searchParams.get("limit");
    const limit = limitParam === null ? undefined : Number(limitParam);
    if (limit !== undefined && !Number.isFinite(limit)) {
      return apiError("limit must be a number", 400, request, { code: "VALIDATION_ERROR" });
    }
    try {
      const result = await listMyAppBookings({
        userId: gate.user.id,
        cursor: url.searchParams.get("cursor"),
        limit,
      });
      if (!result) return apiError("Invalid cursor", 400, request, { code: "VALIDATION_ERROR" });
      return apiOk(result, request, { headers: { "Cache-Control": "no-store" } });
    } catch (err) {
      console.error("GET /api/v1/account/bookings (app):", err);
      return apiError("Could not load bookings", 500, request, { code: "SERVER_ERROR" });
    }
  }

  const result = await getMyBookings(createTrustedApiActor(gate.user));
  if (!result.success) return bffError(result.error || "Failed", 400, request);
  return bffOk({ upcoming: result.upcoming, past: result.past }, request);
}

export async function OPTIONS(request: Request) {
  const { apiOptions } = await import("@/lib/api/response");
  return apiOptions(request);
}
