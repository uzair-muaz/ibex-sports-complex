import { apiOk, apiError, apiOptions } from "@/lib/api/response";
import { requireApiCustomer } from "@/lib/api/guard";
import { cancelAppBooking } from "@/lib/api/app-cancel";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Cancel my booking from the app. Body: { reason, note? }.
 * Money paid goes to the wallet; points and membership hours come back.
 * (The website keeps using DELETE /account/bookings/{id}.)
 */
export async function POST(request: Request, ctx: Ctx) {
  const gate = await requireApiCustomer(request);
  if (!gate.ok) return gate.response;
  const { id } = await ctx.params;
  const body = (await request.json().catch(() => null)) as { reason?: unknown; note?: unknown } | null;
  if (!body) return apiError("Invalid JSON body", 400, request, { code: "VALIDATION_ERROR" });
  try {
    const result = await cancelAppBooking({ userId: gate.user.id, bookingId: id, reason: body.reason, note: body.note });
    if (!result.ok) return apiError(result.error, result.status, request, { code: result.code });
    return apiOk({ booking: result.booking }, request);
  } catch (err) {
    console.error("POST cancel:", err);
    return apiError("Could not cancel the booking", 500, request, { code: "SERVER_ERROR" });
  }
}

export async function OPTIONS(request: Request) {
  return apiOptions(request);
}
