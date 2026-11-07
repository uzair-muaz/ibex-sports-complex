import { apiOk, apiError, apiOptions } from "@/lib/api/response";
import { verifyGoogleIdToken, findOrCreateGoogleUser } from "@/lib/api/google";
import { buildSignInResponse, staffAccountError } from "@/lib/api/auth-session";

/**
 * Flutter / mobile Google sign-in.
 * Body: { idToken: string } — Google ID token from google_sign_in (Android / iPhone / web).
 * Returns: { accessToken, refreshToken, tokenType, expiresAt, expiresIn,
 *            isNewAccount, claimedBookings, user }
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    idToken?: string;
  } | null;
  if (!body?.idToken?.trim()) {
    return apiError("idToken is required", 400, request, { code: "VALIDATION_ERROR" });
  }

  let info;
  try {
    info = await verifyGoogleIdToken(body.idToken.trim());
  } catch (err) {
    const message = err instanceof Error ? err.message : "Google auth failed";
    return apiError(message, 401, request, { code: "INVALID_GOOGLE_TOKEN" });
  }

  try {
    const { user, isNewAccount, isStaff } = await findOrCreateGoogleUser(info);
    if (isStaff) return staffAccountError(request);
    return apiOk(await buildSignInResponse(user, { isNewAccount, request }), request);
  } catch (err) {
    console.error("POST /api/v1/auth/google:", err);
    return apiError("Google sign-in failed", 500, request, { code: "SERVER_ERROR" });
  }
}

export async function OPTIONS(request: Request) {
  return apiOptions(request);
}
