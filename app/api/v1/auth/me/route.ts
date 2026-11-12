import { resolveApiUser } from "@/lib/api/guard";
import { apiOk, apiError, apiOptions } from "@/lib/api/response";
import { BLOCKED_CODE, BLOCKED_MESSAGE } from "@/lib/customer-block-rules";

/** Current user from cookie session or Bearer access token. */
export async function GET(request: Request) {
  const user = await resolveApiUser(request);
  if (!user) return apiError("Unauthorized", 401, request);
  // Blocked by the super admin: the app should show the message and sign out.
  if (user.blocked) return apiError(BLOCKED_MESSAGE, 403, request, { code: BLOCKED_CODE });
  const view: Record<string, unknown> = { ...user };
  delete view.blocked;
  return apiOk({ user: view }, request);
}

export async function OPTIONS(request: Request) {
  return apiOptions(request);
}
