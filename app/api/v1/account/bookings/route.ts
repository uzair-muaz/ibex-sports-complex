import { requireBffCustomer, bffOk, bffError } from "@/lib/bff/http";
import { getMyBookings } from "@/app/actions/customer-bookings";
import { createTrustedApiActor } from "@/lib/action-auth";

export async function GET(request: Request) {
  const gate = await requireBffCustomer(request);
  if (!gate.ok) return gate.response;

  const result = await getMyBookings(createTrustedApiActor(gate.user));
  if (!result.success) return bffError(result.error || "Failed", 400, request);
  return bffOk({ upcoming: result.upcoming, past: result.past }, request);
}

export async function OPTIONS(request: Request) {
  const { apiOptions } = await import("@/lib/api/response");
  return apiOptions(request);
}
