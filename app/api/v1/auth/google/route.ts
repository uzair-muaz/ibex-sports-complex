import { apiOk, apiError, apiOptions } from "@/lib/api/response";
import { verifyGoogleIdToken, upsertUserFromGoogle } from "@/lib/api/google";
import { signMobileAccessToken } from "@/lib/api/mobile-jwt";

/**
 * Flutter / mobile Google sign-in.
 * Body: { idToken: string } — Google ID token from google_sign_in (or Web GIS).
 * Returns: { accessToken, tokenType, expiresIn, user }
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as {
      idToken?: string;
    } | null;
    if (!body?.idToken?.trim()) {
      return apiError("idToken is required", 400, request);
    }

    const info = await verifyGoogleIdToken(body.idToken.trim());
    const user = await upsertUserFromGoogle(info);
    const accessToken = await signMobileAccessToken(user);

    return apiOk(
      {
        accessToken,
        tokenType: "Bearer",
        expiresIn: process.env.API_JWT_EXPIRES_IN || "30d",
        user,
      },
      request,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Google auth failed";
    return apiError(message, 401, request);
  }
}

export async function OPTIONS(request: Request) {
  return apiOptions(request);
}
