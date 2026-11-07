import { apiOk, apiError, apiOptions } from "@/lib/api/response";
import { requireApiCustomer } from "@/lib/api/guard";
import { registerDevice } from "@/lib/notifications/inbox";

/** Save this phone's push token. Body: { platform: "ios" | "android", pushToken }. Call after sign-in and when the token changes. */
export async function POST(request: Request) {
  const gate = await requireApiCustomer(request);
  if (!gate.ok) return gate.response;
  const body = (await request.json().catch(() => null)) as { platform?: unknown; pushToken?: unknown } | null;
  if (!body) return apiError("Invalid JSON body", 400, request, { code: "VALIDATION_ERROR" });
  const result = await registerDevice({ userId: gate.user.id, platform: body.platform, pushToken: body.pushToken });
  if (!result.ok) return apiError(result.error, 400, request, { code: "VALIDATION_ERROR" });
  return apiOk({ ok: true }, request);
}

export async function OPTIONS(request: Request) {
  return apiOptions(request);
}
