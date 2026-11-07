import mongoose from "mongoose";
import { apiOk, apiError, apiOptions } from "@/lib/api/response";
import { requireApiAdmin } from "@/lib/api/guard";
import { buildWallet } from "@/lib/api/wallet-view";
import { staffWalletChange } from "@/lib/wallet-admin";

/** Staff: a customer's wallet. ?userId= */
export async function GET(request: Request) {
  const gate = await requireApiAdmin(request);
  if (!gate.ok) return gate.response;
  const userId = new URL(request.url).searchParams.get("userId") || "";
  if (!mongoose.isValidObjectId(userId)) {
    return apiError("Customer not found", 404, request, { code: "USER_NOT_FOUND" });
  }
  const result = await buildWallet({ userId, limit: 20 });
  return apiOk(result, request, { headers: { "Cache-Control": "no-store" } });
}

/**
 * Staff: change a customer's wallet.
 * Body: { userId, action: "credit" | "debit" | "bank_payout", amount, note, requestId }
 * bank_payout = the customer asked at the desk for their credit back to their bank.
 */
export async function POST(request: Request) {
  const gate = await requireApiAdmin(request);
  if (!gate.ok) return gate.response;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return apiError("Invalid JSON body", 400, request, { code: "VALIDATION_ERROR" });
  const result = await staffWalletChange({
    userId: body.userId,
    action: body.action,
    amount: body.amount,
    note: body.note,
    requestId: body.requestId,
    staffId: gate.user.id,
  });
  if (!result.ok) return apiError(result.error, result.status, request, { code: result.code });
  return apiOk({ balance: result.balance }, request);
}

export async function OPTIONS(request: Request) {
  return apiOptions(request);
}
