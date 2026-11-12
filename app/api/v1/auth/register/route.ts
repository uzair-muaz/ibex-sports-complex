import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { apiOk, apiError, apiOptions } from "@/lib/api/response";
import { registerCustomer } from "@/app/actions/auth-register";
import { buildSignInResponse } from "@/lib/api/auth-session";

const STATUS_FOR_CODE: Record<string, number> = {
  EMAIL_IN_USE: 409,
  SERVER_ERROR: 500,
};

/**
 * Public customer signup (email + password). Creates role "user" only — never staff.
 *
 * Two body shapes are accepted:
 * - Mobile app: { firstName, lastName, email, phone, password } — password ≥ 8.
 * - Website (unchanged): { name, email, phone, password } — password ≥ 6.
 *
 * The mobile shape gets the full sign-in answer (tokens + user). The website shape
 * gets { user } exactly as before and then signs in with its cookie.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as {
      name?: unknown;
      firstName?: unknown;
      lastName?: unknown;
      email?: unknown;
      password?: unknown;
      phone?: unknown;
    } | null;

    if (!body) {
      return apiError("Invalid JSON body", 400, request, { code: "VALIDATION_ERROR" });
    }

    const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
    const isMobileShape = typeof body.firstName === "string";
    const firstName = str(body.firstName);
    const lastName = str(body.lastName);

    if (isMobileShape && (firstName.length < 1 || firstName.length > 50 || lastName.length > 50)) {
      return apiError("First and last name must be 1–50 characters each.", 400, request, {
        code: "VALIDATION_ERROR",
      });
    }

    const phone = str(body.phone);
    if (!phone) {
      return apiError("Phone number is required", 400, request, { code: "INVALID_PHONE" });
    }

    const result = await registerCustomer({
      name: isMobileShape ? `${firstName} ${lastName}`.trim() : str(body.name),
      email: str(body.email),
      password: typeof body.password === "string" ? body.password : "",
      phone,
      minPasswordLength: isMobileShape ? 8 : 6,
    });

    if (!result.success) {
      return apiError(result.error, STATUS_FOR_CODE[result.code] ?? 400, request, {
        code: result.code,
      });
    }

    // Website: same answer as before. It signs in with its cookie next.
    if (!isMobileShape) {
      return apiOk({ user: result.user }, request, { status: 201 });
    }

    await connectDB();
    const user = await User.findById(result.user.id);
    if (!user) {
      return apiError("Registration failed", 500, request, { code: "SERVER_ERROR" });
    }

    const signIn = await buildSignInResponse(user, { isNewAccount: true, request });
    return apiOk(signIn, request, { status: 201 });
  } catch (error) {
    console.error("POST /api/v1/auth/register:", error);
    return apiError("Registration failed", 500, request, { code: "SERVER_ERROR" });
  }
}

export async function OPTIONS(request: Request) {
  return apiOptions(request);
}
