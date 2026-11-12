import { apiOk, apiError, apiOptions } from "@/lib/api/response";
import { getGuestBooking, guestTokensFrom } from "@/lib/api/guest-bookings";

type Ctx = { params: Promise<{ id: string }> };

/** One guest booking. Needs its code in X-Guest-Tokens (or X-Guest-Token). */
export async function GET(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  try {
    const booking = await getGuestBooking(id, guestTokensFrom(request));
    if (!booking) return apiError("Booking not found", 404, request, { code: "BOOKING_NOT_FOUND" });
    return apiOk({ booking }, request, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("GET /api/v1/bookings/guest/[id]:", err);
    return apiError("Could not load the booking", 500, request, { code: "SERVER_ERROR" });
  }
}

export async function OPTIONS(request: Request) {
  return apiOptions(request);
}
