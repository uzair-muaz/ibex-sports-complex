import { requireBffCustomer, bffOk, bffError } from "@/lib/bff/http";
import {
  cancelMyBooking,
  getMyBookingById,
} from "@/app/actions/customer-bookings";
import { createTrustedApiActor } from "@/lib/action-auth";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: Request, ctx: Ctx) {
  const gate = await requireBffCustomer(request);
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
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
