import { apiOk, apiError, apiOptions } from "@/lib/api/response";
import { guestTokensFrom, listGuestBookings } from "@/lib/api/guest-bookings";

/**
 * Guest bookings made on this phone. Send the saved codes in a header:
 * `X-Guest-Tokens: gt_…,gt_…` (never in the address). Unknown codes are ignored.
 */
export async function GET(request: Request) {
  try {
    const items = await listGuestBookings(guestTokensFrom(request));
    return apiOk({ items }, request, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("GET /api/v1/bookings/guest:", err);
    return apiError("Could not load bookings", 500, request, { code: "SERVER_ERROR" });
  }
}

export async function OPTIONS(request: Request) {
  return apiOptions(request);
}
