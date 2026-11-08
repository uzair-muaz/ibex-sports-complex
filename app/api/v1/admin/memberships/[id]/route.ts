import { apiOk, apiError, apiOptions } from "@/lib/api/response";
import { requireApiAdmin } from "@/lib/api/guard";
import { isSuperAdminRole } from "@/lib/authz";
import { adjustMembershipHours, cancelMembership, changeMembershipEndDate } from "@/lib/membership-admin";

/**
 * Super admin: change one customer's membership.
 * Body:
 * - { action: "adjust-hours", sport, hours (+ add / − remove, half hours ok), note, requestId }
 * - { action: "change-end-date", validUntil (ISO date), note }
 * - { action: "cancel", note }
 */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireApiAdmin(request);
  if (!gate.ok) return gate.response;
  if (!isSuperAdminRole(gate.user.role)) {
    return apiError("Super admin only", 403, request, { code: "FORBIDDEN" });
  }
  const { id } = await ctx.params;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return apiError("Invalid JSON body", 400, request, { code: "VALIDATION_ERROR" });

  try {
    const staffId = gate.user.id;
    const result =
      body.action === "adjust-hours"
        ? await adjustMembershipHours({ membershipId: id, sport: body.sport, hours: body.hours, note: body.note, requestId: body.requestId, staffId })
        : body.action === "change-end-date"
          ? await changeMembershipEndDate({ membershipId: id, validUntil: body.validUntil, note: body.note, staffId })
          : body.action === "cancel"
            ? await cancelMembership({ membershipId: id, note: body.note, staffId })
            : null;
    if (!result) {
      return apiError("action must be adjust-hours, change-end-date or cancel", 400, request, { code: "VALIDATION_ERROR" });
    }
    if (!result.ok) return apiError(result.error, result.status, request, { code: result.code });
    const data: Record<string, unknown> = { ...result };
    delete data.ok;
    return apiOk(data, request);
  } catch (err) {
    console.error("POST /api/v1/admin/memberships/[id]:", err);
    return apiError("Could not change the membership", 500, request, { code: "SERVER_ERROR" });
  }
}

export async function OPTIONS(request: Request) {
  return apiOptions(request);
}
