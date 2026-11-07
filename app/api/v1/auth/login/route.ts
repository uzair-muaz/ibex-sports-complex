import bcrypt from "bcryptjs";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { apiOk, apiError, apiOptions } from "@/lib/api/response";
import { buildSignInResponse, isStaffUser, staffAccountError } from "@/lib/api/auth-session";

/**
 * Mobile email + password sign-in.
 * Body: { email, password }. Returns the same answer as /auth/google.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    email?: unknown;
    password?: unknown;
  } | null;

  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!email || !password) {
    return apiError("Please enter your email and password.", 400, request, {
      code: "VALIDATION_ERROR",
    });
  }

  try {
    await connectDB();
    const user = await User.findOne({ email });
    if (!user) {
      return apiError("No account found with this email.", 404, request, {
        code: "ACCOUNT_NOT_FOUND",
      });
    }
    if (!user.password) {
      return apiError(
        "This account uses Google or Apple sign-in. Sign in that way, or use 'Forgot password' to set a password.",
        401,
        request,
        { code: "PASSWORD_NOT_SET" },
      );
    }
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return apiError("Incorrect password.", 401, request, { code: "WRONG_PASSWORD" });
    }
    // Checked after the password, so nobody can learn which emails are staff.
    if (isStaffUser(user)) return staffAccountError(request);

    return apiOk(await buildSignInResponse(user, { isNewAccount: false, request }), request);
  } catch (err) {
    console.error("POST /api/v1/auth/login:", err);
    return apiError("Sign-in failed", 500, request, { code: "SERVER_ERROR" });
  }
}

export async function OPTIONS(request: Request) {
  return apiOptions(request);
}
