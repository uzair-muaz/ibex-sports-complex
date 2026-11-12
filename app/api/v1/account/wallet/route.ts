import { apiOk, apiError, apiOptions } from "@/lib/api/response";
import { requireApiCustomer } from "@/lib/api/guard";
import { buildWallet } from "@/lib/api/wallet-view";

/** My IBEX wallet: balance and history (?cursor=&limit=). */
export async function GET(request: Request) {
  const gate = await requireApiCustomer(request);
  if (!gate.ok) return gate.response;
  const url = new URL(request.url);
  const limitParam = url.searchParams.get("limit");
  const limit = limitParam === null ? undefined : Number(limitParam);
  if (limit !== undefined && !Number.isFinite(limit)) {
    return apiError("limit must be a number", 400, request, { code: "VALIDATION_ERROR" });
  }
  try {
    const result = await buildWallet({ userId: gate.user.id, cursor: url.searchParams.get("cursor"), limit });
    if (!result) return apiError("Invalid cursor", 400, request, { code: "VALIDATION_ERROR" });
    return apiOk(result, request, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("GET /api/v1/account/wallet:", err);
    return apiError("Could not load the wallet", 500, request, { code: "SERVER_ERROR" });
  }
}

export async function OPTIONS(request: Request) {
  return apiOptions(request);
}
