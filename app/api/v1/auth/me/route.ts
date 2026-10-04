import { resolveApiUser } from "@/lib/api/guard";
import { apiOk, apiError, apiOptions } from "@/lib/api/response";

/** Current user from cookie session or Bearer access token. */
export async function GET(request: Request) {
  const user = await resolveApiUser(request);
  if (!user) return apiError("Unauthorized", 401, request);
  return apiOk({ user }, request);
}

export async function OPTIONS(request: Request) {
  return apiOptions(request);
}
