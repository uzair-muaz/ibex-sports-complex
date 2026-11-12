import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { apiOk, apiError, apiOptions } from "@/lib/api/response";
import { requireApiCustomer } from "@/lib/api/guard";
import { setMyPassword } from "@/app/actions/account";
import { createTrustedApiActor } from "@/lib/action-auth";
import { revokeAllRefreshTokens } from "@/lib/api/refresh-tokens";
import { buildSignInResponse } from "@/lib/api/auth-session";

const STATUS_FOR_CODE: Record<string, number> = {
  WRONG_PASSWORD: 401,
  ACCOUNT_NOT_FOUND: 404,
};

/**
 * Mobile change password. Body: { oldPassword, newPassword } (currentPassword also accepted).
 * New password: at least 8 characters.
 * Signs out every other phone (all refresh tokens cancelled) and returns fresh
 * tokens so this phone stays signed in.
 */
export async function POST(request: Request) {
  const gate = await requireApiCustomer(request);
  if (!gate.ok) return gate.response;

  const body = (await request.json().catch(() => ({}))) as {
    oldPassword?: unknown;
    currentPassword?: unknown;
    newPassword?: unknown;
  };
  const oldPassword =
    typeof body.oldPassword === "string"
      ? body.oldPassword
      : typeof body.currentPassword === "string"
        ? body.currentPassword
        : "";
  const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";

  if (newPassword.length < 8) {
    return apiError("New password must be at least 8 characters.", 400, request, {
      code: "WEAK_PASSWORD",
    });
  }

  try {
    const result = await setMyPassword(
      { currentPassword: oldPassword, newPassword },
      createTrustedApiActor(gate.user),
    );
    if (!result.success) {
      const code = "code" in result && result.code ? result.code : "VALIDATION_ERROR";
      return apiError(result.error || "Failed", STATUS_FOR_CODE[code] ?? 400, request, { code });
    }

    await revokeAllRefreshTokens(gate.user.id);
    await connectDB();
    const user = await User.findById(gate.user.id);
    if (!user) {
      return apiError("User not found", 404, request, { code: "ACCOUNT_NOT_FOUND" });
    }
    const signIn = await buildSignInResponse(user, { isNewAccount: false, request });
    return apiOk({ success: true, ...signIn }, request);
  } catch (err) {
    console.error("POST /api/v1/account/change-password:", err);
    return apiError("Could not change password", 500, request, { code: "SERVER_ERROR" });
  }
}

export async function OPTIONS(request: Request) {
  return apiOptions(request);
}
