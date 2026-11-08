import { apiOk, apiError, apiOptions } from "@/lib/api/response";
import { requireApiAdmin } from "@/lib/api/guard";
import { isSuperAdminRole } from "@/lib/authz";
import { deletePromo, promoUses, updatePromo } from "@/lib/promo-admin";

type Ctx = { params: Promise<{ id: string }> };

/** Staff: who used this code. */
export async function GET(request: Request, ctx: Ctx) {
  const gate = await requireApiAdmin(request);
  if (!gate.ok) return gate.response;
  const uses = await promoUses((await ctx.params).id);
  if (!uses) return apiError("Promo code not found", 404, request, { code: "NOT_FOUND" });
  return apiOk({ uses }, request, { headers: { "Cache-Control": "no-store" } });
}

/** Super admin: change a code (any field; switch on/off with isActive). */
export async function PATCH(request: Request, ctx: Ctx) {
  const gate = await requireApiAdmin(request);
  if (!gate.ok) return gate.response;
  if (!isSuperAdminRole(gate.user.role)) return apiError("Super admin only", 403, request, { code: "FORBIDDEN" });
  const body = await request.json().catch(() => null);
  const r = await updatePromo((await ctx.params).id, body);
  if (!r.ok) return apiError(r.error, r.status, request, { code: r.code });
  return apiOk({ promo: r.promo }, request);
}

/** Super admin: delete a code nobody has used. */
export async function DELETE(request: Request, ctx: Ctx) {
  const gate = await requireApiAdmin(request);
  if (!gate.ok) return gate.response;
  if (!isSuperAdminRole(gate.user.role)) return apiError("Super admin only", 403, request, { code: "FORBIDDEN" });
  const r = await deletePromo((await ctx.params).id);
  if (!r.ok) return apiError(r.error, r.status, request, { code: r.code });
  return apiOk({ deleted: true }, request);
}

export async function OPTIONS(request: Request) {
  return apiOptions(request);
}
