import { requireBffCustomer, bffOk, bffError } from "@/lib/bff/http";
import { claimBookingsByEmail } from "@/app/actions/account";
import { createTrustedApiActor } from "@/lib/action-auth";

/** Link historical guest bookings (same email, no userId) to this account. */
export async function POST(request: Request) {
  const gate = await requireBffCustomer(request);
  if (!gate.ok) return gate.response;

  const result = await claimBookingsByEmail(createTrustedApiActor(gate.user));
  if (!result.success) return bffError(result.error || "Failed", 400, request);
  return bffOk({ claimed: result.claimed }, request);
}

export async function OPTIONS(request: Request) {
  const { apiOptions } = await import("@/lib/api/response");
  return apiOptions(request);
}
