import { apiOk, apiError, apiOptions } from "@/lib/api/response";
import { requireApiCustomer } from "@/lib/api/guard";
import { getDeletionCheck } from "@/lib/account-deletion";

/** Can I delete my account? Lists the bookings in the way, plus wallet credit and points that would be lost. */
export async function GET(request: Request) {
  const gate = await requireApiCustomer(request);
  if (!gate.ok) return gate.response;
  try {
    const check = await getDeletionCheck(gate.user.id);
    return apiOk(check, request, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("GET /api/v1/account/deletion-check:", err);
    return apiError("Could not check your account", 500, request, { code: "SERVER_ERROR" });
  }
}

export async function OPTIONS(request: Request) {
  return apiOptions(request);
}
