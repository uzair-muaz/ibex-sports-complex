import { apiOk, apiError, apiOptions } from "@/lib/api/response";
import { resolveApiUser } from "@/lib/api/guard";
import { revokeAllRefreshTokens, revokeRefreshToken } from "@/lib/api/refresh-tokens";

/**
 * Sign out on this phone. Body: { refreshToken, allDevices?: boolean }.
 * The refresh token is cancelled so it can't be used again. The current access
 * token simply runs out at its expiresAt; the app should delete it now.
 *
 * Works even if the access token has already run out: holding the refresh
 * token is enough to cancel it. "allDevices" needs a valid access token.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    refreshToken?: unknown;
    allDevices?: unknown;
  };
  const refreshToken =
    typeof body.refreshToken === "string" ? body.refreshToken.trim() : "";

  try {
    const user = await resolveApiUser(request);

    if (body.allDevices === true) {
      if (!user) {
        return apiError("Unauthorized", 401, request, { code: "UNAUTHORIZED" });
      }
      const revoked = await revokeAllRefreshTokens(user.id);
      return apiOk({ success: true, revoked }, request);
    }

    if (!refreshToken) {
      if (!user) {
        return apiError("Unauthorized", 401, request, { code: "UNAUTHORIZED" });
      }
      return apiOk({ success: true, revoked: 0 }, request);
    }

    const revoked = await revokeRefreshToken(user?.id ?? null, refreshToken);
    return apiOk({ success: true, revoked }, request);
  } catch (err) {
    console.error("POST /api/v1/auth/logout:", err);
    return apiError("Sign-out failed", 500, request, { code: "SERVER_ERROR" });
  }
}

export async function OPTIONS(request: Request) {
  return apiOptions(request);
}
