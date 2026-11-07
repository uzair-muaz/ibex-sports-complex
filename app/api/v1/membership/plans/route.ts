import { apiOk, apiError, apiOptions } from "@/lib/api/response";
import { listPublicPlans } from "@/lib/membership-plans";

/** Public: membership plans to show on the Plans screen, and the WhatsApp link to buy one. */
export async function GET(request: Request) {
  try {
    return apiOk(await listPublicPlans(), request, { headers: { "Cache-Control": "public, max-age=60" } });
  } catch (err) {
    console.error("GET /api/v1/membership/plans:", err);
    return apiError("Could not load plans", 500, request, { code: "SERVER_ERROR" });
  }
}

export async function OPTIONS(request: Request) {
  return apiOptions(request);
}
