import { apiOk, apiError, apiOptions } from "@/lib/api/response";
import { requireApiAdmin } from "@/lib/api/guard";
import { isSuperAdminRole } from "@/lib/authz";
import { blockCustomer, unblockCustomer } from "@/lib/customer-block";
import { audit } from "@/lib/audit";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Super admin: block or unblock a customer.
 * Body { blocked: true, reason } or { blocked: false }.
 */
export async function POST(request: Request, ctx: Ctx) {
  const gate = await requireApiAdmin(request);
  if (!gate.ok) return gate.response;
  if (!isSuperAdminRole(gate.user.role)) return apiError("Super admin only", 403, request, { code: "FORBIDDEN" });
  const { id } = await ctx.params;
  const body = (await request.json().catch(() => null)) as { blocked?: unknown; reason?: unknown } | null;
  if (typeof body?.blocked !== "boolean") return apiError("blocked must be true or false", 400, request, { code: "VALIDATION_ERROR" });

  if (body.blocked) {
    const r = await blockCustomer({ userId: id, reason: body.reason, staffId: gate.user.id });
    if (!r.ok) return apiError(r.error, r.status, request, { code: r.code });
    await audit({
      actor: gate.user,
      area: "users",
      action: "block",
      targetId: id,
      targetLabel: r.user.email,
      customerId: id,
      summary: `Blocked ${r.user.name} — ${r.reason}${r.upcomingBookings ? ` (${r.upcomingBookings} upcoming booking(s) left as they are)` : ""}`,
    });
    return apiOk({ blocked: true, upcomingBookings: r.upcomingBookings }, request);
  }

  const r = await unblockCustomer({ userId: id });
  if (!r.ok) return apiError(r.error, r.status, request, { code: r.code });
  await audit({ actor: gate.user, area: "users", action: "unblock", targetId: id, targetLabel: r.user.email, customerId: id, summary: `Unblocked ${r.user.name}` });
  return apiOk({ blocked: false }, request);
}

export async function OPTIONS(request: Request) {
  return apiOptions(request);
}
