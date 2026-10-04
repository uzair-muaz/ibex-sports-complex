import { apiOk, apiError, apiOptions } from "@/lib/api/response";
import { requestPasswordReset } from "@/app/actions/auth-password-reset";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as {
      email?: string;
    } | null;
    if (!body?.email?.trim()) {
      return apiError("Email is required", 400, request);
    }

    const result = await requestPasswordReset(body.email);
    return apiOk(result, request);
  } catch (error) {
    console.error("POST /api/v1/auth/forgot-password:", error);
    return apiError("Unable to process request", 500, request);
  }
}

export async function OPTIONS(request: Request) {
  return apiOptions(request);
}
