import { requireBffCustomer, bffOk, bffError } from "@/lib/bff/http";
import {
  cancelMyBooking,
  getMyBookingById,
} from "@/app/actions/customer-bookings";
import { createTrustedApiActor } from "@/lib/action-auth";
import { apiError, apiOk } from "@/lib/api/response";
import { getMyAppBooking } from "@/lib/api/my-bookings";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, ctx: Ctx) {
  const gate = await requireBffCustomer(request);
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  // App: ?format=app → { booking } in the app's shape. Website: unchanged.
  if (new URL(request.url).searchParams.get("format") === "app") {
    try {
      const booking = await getMyAppBooking(gate.user.id, id);
      if (!booking) return apiError("Booking not found", 404, request, { code: "BOOKING_NOT_FOUND" });
      return apiOk({ booking }, request, { headers: { "Cache-Control": "no-store" } });
    } catch (err) {
      console.error("GET /api/v1/account/bookings/[id] (app):", err);
      return apiError("Could not load the booking", 500, request, { code: "SERVER_ERROR" });
    }
  }

  const result = await getMyBookingById(id, createTrustedApiActor(gate.user));
  if (!result.success) return bffError(result.error || "Not found", 404, request);
  return bffOk({ booking: result.booking, canCancel: result.canCancel }, request);
}

export async function DELETE(request: Request, ctx: Ctx) {
  const gate = await requireBffCustomer(request);
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  const result = await cancelMyBooking(id, createTrustedApiActor(gate.user));
  if (!result.success) return bffError(result.error || "Failed", 400, request);
  return bffOk({ success: true }, request);
}

export async function OPTIONS(request: Request) {
  const { apiOptions } = await import("@/lib/api/response");
  return apiOptions(request);
}
