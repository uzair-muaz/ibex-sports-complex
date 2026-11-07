import { apiOk, apiError, apiOptions } from "@/lib/api/response";
import { requireApiAdmin } from "@/lib/api/guard";
import { isSuperAdminRole } from "@/lib/authz";
import { createPlan, listAdminPlans, validatePlanInput } from "@/lib/membership-plans";

/** Staff: every plan (staff need it to activate; only the super admin can change plans). */
export async function GET(request: Request) {
  const gate = await requireApiAdmin(request);
  if (!gate.ok) return gate.response;
  return apiOk({ plans: await listAdminPlans() }, request, { headers: { "Cache-Control": "no-store" } });
}

/** Super admin: make a plan. Body: { name, price, validityDays, hoursBySport: [{sport, hours}], weekdayOnly?, badge?, features?, isActive?, sortOrder? } */
export async function POST(request: Request) {
  const gate = await requireApiAdmin(request);
  if (!gate.ok) return gate.response;
  if (!isSuperAdminRole(gate.user.role)) {
    return apiError("Super admin only", 403, request, { code: "FORBIDDEN" });
  }
  const check = validatePlanInput(await request.json().catch(() => null), false);
  if (!check.ok) return apiError(check.error, 400, request, { code: "VALIDATION_ERROR" });
  const plan = await createPlan(check.value);
  return apiOk({ plan }, request, { status: 201 });
}

export async function OPTIONS(request: Request) {
  return apiOptions(request);
}
