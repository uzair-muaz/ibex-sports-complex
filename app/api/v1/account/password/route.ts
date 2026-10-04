import { requireBffCustomer, bffOk, bffError } from "@/lib/bff/http";
import { setMyPassword } from "@/app/actions/account";
import { createTrustedApiActor } from "@/lib/action-auth";

/**
 * Set or change password for the authenticated customer.
 * Google users with no password yet can set one without currentPassword.
 */
export async function POST(request: Request) {
  const gate = await requireBffCustomer(request);
  if (!gate.ok) return gate.response;

  const body = (await request.json().catch(() => ({}))) as {
    currentPassword?: string;
    newPassword?: string;
  };

  if (!body.newPassword) {
    return bffError("newPassword is required", 400, request);
  }

  const result = await setMyPassword(
    {
      currentPassword: body.currentPassword,
      newPassword: body.newPassword,
    },
    createTrustedApiActor(gate.user),
  );

  if (!result.success) return bffError(result.error || "Failed", 400, request);
  return bffOk({ hasPassword: result.hasPassword }, request);
}

export async function OPTIONS(request: Request) {
  const { apiOptions } = await import("@/lib/api/response");
  return apiOptions(request);
}
