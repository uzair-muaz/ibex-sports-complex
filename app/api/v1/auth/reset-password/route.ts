import { apiOk, apiError, apiOptions } from "@/lib/api/response";
import { resetPasswordWithToken } from "@/app/actions/auth-password-reset";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as {
      token?: string;
      newPassword?: string;
    } | null;

    if (!body?.token?.trim() || !body?.newPassword) {
      return apiError("token and newPassword are required", 400, request);
    }

    const result = await resetPasswordWithToken({
      token: body.token,
      newPassword: body.newPassword,
    });

    if (!result.success) {
      return apiError(result.error, 400, request);
    }

    return apiOk({ success: true }, request);
  } catch (error) {
    console.error("POST /api/v1/auth/reset-password:", error);
    return apiError("Unable to reset password", 500, request);
  }
}

export async function OPTIONS(request: Request) {
  return apiOptions(request);
}
