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
import { apiError, apiOk } from "@/lib/api/response";
import { createAppBooking, type AppBookingBody } from "@/lib/api/create-app-booking";

/**
 * Public booking create.
 * Guests allowed; authenticated customers (cookie or Bearer) get userId linked.
 *
 * Two shapes:
 * - Mobile app: body has `courtId` + `start` → handled by createAppBooking.
 * - Website: body has `courtType`, `date`, `startTime` … → unchanged.
 */
export async function POST(request: Request) {
  const apiUser = await optionalApiUser(request);

  const body = (await request.json().catch(() => null)) as CreateBookingInput | null;
  if (!body) return bffError("Invalid body", 400, request);

  if (isAppBody(body)) {
    try {
      const result = await createAppBooking({
        body,
        user: apiUser,
        idempotencyKey: request.headers.get("idempotency-key"),
      });
      if (!result.ok) return apiError(result.error, result.status, request, { code: result.code });
      return apiOk(
        { booking: result.booking, guestAccessToken: result.guestAccessToken },
        request,
        { status: result.status, headers: { "Cache-Control": "no-store" } },
      );
    } catch (err) {
      console.error("POST /api/v1/bookings (app):", err);
      return apiError("Could not make the booking", 500, request, { code: "SERVER_ERROR" });
    }
  }

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

function isAppBody(body: unknown): body is AppBookingBody {
  return (
    typeof body === "object" &&
    body !== null &&
    "courtId" in body &&
    "start" in body &&
    !("courtType" in body)
  );
}

export async function OPTIONS(request: Request) {
  const { apiOptions } = await import("@/lib/api/response");
  return apiOptions(request);
}
