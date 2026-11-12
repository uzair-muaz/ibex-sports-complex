import { apiOk, apiError, apiOptions } from "@/lib/api/response";
import { audit } from "@/lib/audit";
import { proofRef } from "@/lib/payments/proof-ref";
import { requireApiAdmin } from "@/lib/api/guard";
import { rejectProof } from "@/lib/payments/proofs";

type Ctx = { params: Promise<{ id: string }> };

/** Staff: the screenshot is wrong. Body: { reason } (shown to the customer). */
export async function POST(request: Request, ctx: Ctx) {
  const gate = await requireApiAdmin(request);
  if (!gate.ok) return gate.response;
  const { id } = await ctx.params;
  const body = (await request.json().catch(() => null)) as { reason?: unknown } | null;
  const result = await rejectProof({ proofId: id, reason: body?.reason, staffId: gate.user.id });
  if (!result.ok) return apiError(result.error, result.status, request, { code: result.code });
  const ref = await proofRef(id);
  await audit({
    actor: gate.user,
    area: "payments",
    action: "reject",
    targetId: ref.bookingId ?? id,
    targetLabel: ref.label,
    customerId: ref.customerId,
    summary: `Rejected a payment screenshot for ${ref.label}: ${String(body?.reason ?? "").slice(0, 200)}`,
  });
  return apiOk({ success: true }, request);
}

export async function OPTIONS(request: Request) {
  return apiOptions(request);
}
