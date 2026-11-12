import { apiOk, apiError, apiOptions } from "@/lib/api/response";
import { requireApiCustomer } from "@/lib/api/guard";
import { getPreferences, savePreferences, validatePreferencesPatch } from "@/lib/preferences";

/** My preferences (sport, level, hand, court side, notification switches). */
export async function GET(request: Request) {
  const gate = await requireApiCustomer(request);
  if (!gate.ok) return gate.response;
  try {
    return apiOk(await getPreferences(gate.user.id), request, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("GET /api/v1/account/preferences:", err);
    return apiError("Could not load preferences", 500, request, { code: "SERVER_ERROR" });
  }
}

/** Save preferences. Only the fields sent change; null clears a choice. Returns the full set. */
export async function PUT(request: Request) {
  const gate = await requireApiCustomer(request);
  if (!gate.ok) return gate.response;
  const body = await request.json().catch(() => null);
  const check = validatePreferencesPatch(body);
  if (!check.ok) return apiError(check.error, 400, request, { code: "VALIDATION_ERROR" });
  try {
    return apiOk(await savePreferences(gate.user.id, check.value), request, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("PUT /api/v1/account/preferences:", err);
    return apiError("Could not save preferences", 500, request, { code: "SERVER_ERROR" });
  }
}

export const PATCH = PUT;

export async function OPTIONS(request: Request) {
  return apiOptions(request);
}
