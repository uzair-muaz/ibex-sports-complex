import { requireApiAdmin } from "@/lib/api/guard";
import { apiOk, apiError, apiOptions } from "@/lib/api/response";
import { isSuperAdminRole } from "@/lib/authz";
import { getAppSettings, updateAppSettings, validateSettingsPatch } from "@/lib/app-settings";

/** Super admin: read venue info, per-sport app rules and the cancellation notice. */
export async function GET(request: Request) {
  const gate = await requireApiAdmin(request);
  if (!gate.ok) return gate.response;
  if (!isSuperAdminRole(gate.user.role)) {
    return apiError("Super admin only", 403, request, { code: "FORBIDDEN" });
  }
  return apiOk({ settings: await getAppSettings() }, request);
}

/** Super admin: change any part. Body: { venue?, sports?: [{ sport, … }], cancellationNoticeMinutes? } */
export async function PATCH(request: Request) {
  const gate = await requireApiAdmin(request);
  if (!gate.ok) return gate.response;
  if (!isSuperAdminRole(gate.user.role)) {
    return apiError("Super admin only", 403, request, { code: "FORBIDDEN" });
  }

  const body = await request.json().catch(() => null);
  const check = validateSettingsPatch(body);
  if (!check.ok) return apiError(check.error, 400, request, { code: "VALIDATION_ERROR" });

  try {
    const result = await updateAppSettings(check.value, gate.user.id);
    if (!result.ok) return apiError(result.error, 400, request, { code: "VALIDATION_ERROR" });
    return apiOk({ settings: result.settings }, request);
  } catch (err) {
    console.error("PATCH /api/v1/admin/settings:", err);
    return apiError("Could not save settings", 500, request, { code: "SERVER_ERROR" });
  }
}

export async function OPTIONS(request: Request) {
  return apiOptions(request);
}
