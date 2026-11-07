import mongoose from "mongoose";
import { apiOk, apiError, apiOptions } from "@/lib/api/response";
import { requireApiAdmin } from "@/lib/api/guard";
import { isSuperAdminRole } from "@/lib/authz";
import { updatePlan, validatePlanInput } from "@/lib/membership-plans";

/**
 * Super admin: change a plan (any of the POST fields). Members who already
 * have the plan keep the hours they were given; changes apply to new activations.
 * To stop selling a plan, send { isActive: false }.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireApiAdmin(request);
  if (!gate.ok) return gate.response;
  if (!isSuperAdminRole(gate.user.role)) {
    return apiError("Super admin only", 403, request, { code: "FORBIDDEN" });
  }
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return apiError("Plan not found", 404, request, { code: "PLAN_NOT_FOUND" });
  const check = validatePlanInput(await request.json().catch(() => null), true);
  if (!check.ok) return apiError(check.error, 400, request, { code: "VALIDATION_ERROR" });
  const plan = await updatePlan(id, check.value);
  if (!plan) return apiError("Plan not found", 404, request, { code: "PLAN_NOT_FOUND" });
  return apiOk({ plan }, request);
}

export async function OPTIONS(request: Request) {
  return apiOptions(request);
}
