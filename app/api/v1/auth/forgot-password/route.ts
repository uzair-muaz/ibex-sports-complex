import { apiOk, apiError, apiOptions } from "@/lib/api/response";
import { requestPasswordReset } from "@/app/actions/auth-password-reset";
import { RESET_LINK_MINUTES, normaliseResetEmail } from "@/lib/password-reset-rules";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as {
      email?: string;
    } | null;
    if (!body?.email?.trim()) {
      return apiError("Email is required", 400, request);
    }

    // Same answer whether or not the account exists (doesn't reveal who is registered).
    const result = await requestPasswordReset(body.email);
    return apiOk(
      { ...result, sentTo: normaliseResetEmail(body.email), linkValidMinutes: RESET_LINK_MINUTES },
      request,
    );
  } catch (error) {
    console.error("POST /api/v1/auth/forgot-password:", error);
    return apiError("Unable to process request", 500, request);
  }
}

export async function OPTIONS(request: Request) {
  return apiOptions(request);
}
