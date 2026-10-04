import {
  requireBffCustomer,
  optionalApiUser,
  bffOk,
  bffError,
} from "@/lib/bff/http";
import {
  createBooking,
  type CreateBookingInput,
} from "@/app/actions/bookings";
import { createTrustedApiActor } from "@/lib/action-auth";

/**
 * Public booking create.
 * Guests allowed; authenticated customers (cookie or Bearer) get userId linked.
 */
export async function POST(request: Request) {
  const apiUser = await optionalApiUser(request);

  const body = (await request.json().catch(() => null)) as CreateBookingInput | null;
  if (!body) return bffError("Invalid body", 400, request);

  // If caller claims membership/loyalty, require customer session
  if (body.useMembershipHours || (body.loyaltyPointsToRedeem ?? 0) > 0) {
    const gate = await requireBffCustomer(request);
    if (!gate.ok) return gate.response;
  }

  const result = await createBooking(
    body,
    apiUser
      ? createTrustedApiActor(apiUser)
      : undefined,
  );
  if (!result.success) return bffError(result.error || "Failed", 400, request);
  return bffOk(result, request);
}

export async function OPTIONS(request: Request) {
  const { apiOptions } = await import("@/lib/api/response");
  return apiOptions(request);
}
