import { apiOk, apiError, apiOptions } from "@/lib/api/response";
import mongoose from "mongoose";
import PromoCode from "@/models/PromoCode";
import { audit, snapshot } from "@/lib/audit";
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
  const id = (await ctx.params).id;
  const before = mongoose.isValidObjectId(id) ? await PromoCode.findById(id).lean() : null;
  const r = await updatePromo(id, body);
  if (!r.ok) return apiError(r.error, r.status, request, { code: r.code });
  const after = await PromoCode.findById(id).lean();
  await audit({
    actor: gate.user,
    area: "promo_codes",
    action: "update",
    targetId: id,
    targetLabel: r.promo.code,
    summary: `Changed promo code ${r.promo.code}`,
    before: snapshot(before),
    after: snapshot(after),
  });
  return apiOk({ promo: r.promo }, request);
}

/** Super admin: delete a code nobody has used. */
export async function DELETE(request: Request, ctx: Ctx) {
  const gate = await requireApiAdmin(request);
  if (!gate.ok) return gate.response;
  if (!isSuperAdminRole(gate.user.role)) return apiError("Super admin only", 403, request, { code: "FORBIDDEN" });
  const id = (await ctx.params).id;
  const before = mongoose.isValidObjectId(id) ? await PromoCode.findById(id).lean() : null;
  const r = await deletePromo(id);
  if (!r.ok) return apiError(r.error, r.status, request, { code: r.code });
  await audit({ actor: gate.user, area: "promo_codes", action: "delete", targetId: id, targetLabel: before?.code ?? null, summary: `Deleted promo code ${before?.code ?? ""}`.trim() });
  return apiOk({ deleted: true }, request);
}

export async function OPTIONS(request: Request) {
  return apiOptions(request);
}
