import { apiOk, apiError, apiOptions } from "@/lib/api/response";
import mongoose from "mongoose";
import Closure from "@/models/Closure";
import { audit, snapshot } from "@/lib/audit";
import { requireApiAdmin } from "@/lib/api/guard";
import { isSuperAdminRole } from "@/lib/authz";
import { closureDetails, deleteClosure, updateClosure } from "@/lib/closure-admin";

type Ctx = { params: Promise<{ id: string }> };

/** Staff: the closure and the bookings inside it (to call or cancel). */
export async function GET(request: Request, ctx: Ctx) {
  const gate = await requireApiAdmin(request);
  if (!gate.ok) return gate.response;
  const details = await closureDetails((await ctx.params).id);
  if (!details) return apiError("Closure not found", 404, request, { code: "NOT_FOUND" });
  return apiOk(details, request, { headers: { "Cache-Control": "no-store" } });
}

/** Super admin: change a closure. */
export async function PATCH(request: Request, ctx: Ctx) {
  const gate = await requireApiAdmin(request);
  if (!gate.ok) return gate.response;
  if (!isSuperAdminRole(gate.user.role)) return apiError("Super admin only", 403, request, { code: "FORBIDDEN" });
  const body = await request.json().catch(() => null);
  const id = (await ctx.params).id;
  const before = mongoose.isValidObjectId(id) ? await Closure.findById(id).lean() : null;
  const r = await updateClosure(id, body);
  if (!r.ok) return apiError(r.error, r.status, request, { code: r.code });
  await audit({
    actor: gate.user,
    area: "closures",
    action: "update",
    targetId: id,
    targetLabel: r.closure.courts.join(", "),
    summary: `Changed a closure (${r.closure.courts.join(", ")})`,
    before: snapshot(before),
    after: snapshot(await Closure.findById(id).lean()),
  });
  return apiOk({ closure: r.closure }, request);
}

/** Super admin: remove a closure (the time opens for booking again). */
export async function DELETE(request: Request, ctx: Ctx) {
  const gate = await requireApiAdmin(request);
  if (!gate.ok) return gate.response;
  if (!isSuperAdminRole(gate.user.role)) return apiError("Super admin only", 403, request, { code: "FORBIDDEN" });
  const id = (await ctx.params).id;
  const before = mongoose.isValidObjectId(id) ? await Closure.findById(id).lean() : null;
  const r = await deleteClosure(id);
  if (!r.ok) return apiError(r.error, r.status, request, { code: r.code });
  await audit({
    actor: gate.user,
    area: "closures",
    action: "delete",
    targetId: id,
    summary: `Removed a closure${before ? ` (${before.startsAt.toISOString().slice(0, 10)}, ${before.reason})` : ""}`,
    before: snapshot(before),
  });
  return apiOk({ deleted: true }, request);
}

export async function OPTIONS(request: Request) {
  return apiOptions(request);
}
