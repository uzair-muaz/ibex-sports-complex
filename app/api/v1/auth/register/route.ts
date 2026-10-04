import { apiOk, apiError, apiOptions } from "@/lib/api/response";
import { registerCustomer } from "@/app/actions/auth-register";

/**
 * Public customer signup (email + password).
 * Creates role "user" only — never staff.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as {
      name?: string;
      email?: string;
      password?: string;
      phone?: string;
    } | null;

    if (!body) {
      return apiError("Invalid JSON body", 400, request);
    }

    const result = await registerCustomer({
      name: body.name || "",
      email: body.email || "",
      password: body.password || "",
      phone: body.phone,
    });

    if (!result.success) {
      return apiError(result.error, 400, request);
    }

    return apiOk({ user: result.user }, request, { status: 201 });
  } catch (error) {
    console.error("POST /api/v1/auth/register:", error);
    return apiError("Registration failed", 500, request);
  }
}

export async function OPTIONS(request: Request) {
  return apiOptions(request);
}
