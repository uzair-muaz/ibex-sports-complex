import { apiOk, apiError, apiOptions } from "@/lib/api/response";
import { requireApiAdmin } from "@/lib/api/guard";
import { getAppSettings } from "@/lib/app-settings";
import { verifyProof } from "@/lib/payments/proofs";

type Ctx = { params: Promise<{ id: string }> };

/** Staff: the money arrived. Body: { amount } (whole PKR that actually arrived). */
export async function POST(request: Request, ctx: Ctx) {
  const gate = await requireApiAdmin(request);
  if (!gate.ok) return gate.response;
  const { id } = await ctx.params;
  const body = (await request.json().catch(() => null)) as { amount?: unknown } | null;
  const settings = await getAppSettings();
  const result = await verifyProof({
    proofId: id,
    amount: body?.amount,
    staffId: gate.user.id,
    minAdvancePercent: settings.payments.minAdvancePercent,
  });
  if (!result.ok) return apiError(result.error, result.status, request, { code: result.code });
  return apiOk({ success: true }, request);
}

export async function OPTIONS(request: Request) {
  return apiOptions(request);
}
