import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { apiOk, apiError, apiOptions } from "@/lib/api/response";
import { consumeRefreshToken } from "@/lib/api/refresh-tokens";
import { blockedAccountError, isBlockedUser, buildSignInResponse, isStaffUser, staffAccountError } from "@/lib/api/auth-session";

/**
 * Swap a refresh token for a new access token AND a new refresh token.
 * Each refresh token works once. Body: { refreshToken }.
 * Any failure → 401 REFRESH_EXPIRED, and the app signs the user out.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { refreshToken?: unknown } | null;
  const token = typeof body?.refreshToken === "string" ? body.refreshToken.trim() : "";
  if (!token) {
    return apiError("refreshToken is required", 400, request, { code: "VALIDATION_ERROR" });
  }

  try {
    const result = await consumeRefreshToken(token);
    if (!result.ok) {
      return apiError("Please sign in again.", 401, request, { code: "REFRESH_EXPIRED" });
    }

    await connectDB();
    const user = await User.findById(result.userId);
    if (!user) {
      return apiError("Please sign in again.", 401, request, { code: "REFRESH_EXPIRED" });
    }
    if (isStaffUser(user)) return staffAccountError(request);
    if (isBlockedUser(user)) return blockedAccountError(request);

    return apiOk(await buildSignInResponse(user, { isNewAccount: false, request }), request);
  } catch (err) {
    console.error("POST /api/v1/auth/refresh:", err);
    return apiError("Could not refresh sign-in", 500, request, { code: "SERVER_ERROR" });
  }
}

export async function OPTIONS(request: Request) {
  return apiOptions(request);
}
