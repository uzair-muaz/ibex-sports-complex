import { apiOk, apiError, apiOptions } from "@/lib/api/response";
import { requireApiCustomer } from "@/lib/api/guard";
import { deleteCustomerAccount } from "@/lib/account-deletion";

/**
 * Delete my account. Body: { forfeitWallet: boolean }.
 * 409 ACTIVE_BOOKINGS while a booking isn't completed or cancelled;
 * 409 WALLET_NOT_EMPTY when there is credit and forfeitWallet isn't true.
 */
export async function POST(request: Request) {
  const gate = await requireApiCustomer(request);
  if (!gate.ok) return gate.response;
  const body = (await request.json().catch(() => null)) as { forfeitWallet?: unknown } | null;
  const forfeitWallet = body?.forfeitWallet === true;
  try {
    const result = await deleteCustomerAccount({ userId: gate.user.id, forfeitWallet });
    if (!result.ok) {
      return apiError(result.message, result.status, request, { code: result.code, message: result.message });
    }
    return apiOk({ deleted: true }, request, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("POST /api/v1/account/delete:", err);
    return apiError("Could not delete your account. Please try again.", 500, request, { code: "SERVER_ERROR" });
  }
}

export async function OPTIONS(request: Request) {
  return apiOptions(request);
}
