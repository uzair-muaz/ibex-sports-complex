import { requireBffCustomer, bffOk, bffError } from "@/lib/bff/http";
import { getMyProfile, updateMyProfile } from "@/app/actions/account";
import { createTrustedApiActor } from "@/lib/action-auth";

export async function GET(request: Request) {
  const gate = await requireBffCustomer(request);
  if (!gate.ok) return gate.response;

  const result = await getMyProfile(createTrustedApiActor(gate.user));
  if (!result.success) return bffError(result.error || "Failed", 400, request);
  return bffOk({ user: result.user }, request);
}

export async function PATCH(request: Request) {
  const gate = await requireBffCustomer(request);
  if (!gate.ok) return gate.response;

  const body = (await request.json().catch(() => ({}))) as {
    name?: string;
    phone?: string;
  };
  const result = await updateMyProfile(body, createTrustedApiActor(gate.user));
  if (!result.success) return bffError(result.error || "Failed", 400, request);
  return bffOk({ user: result.user }, request);
}

export async function OPTIONS(request: Request) {
  const { apiOptions } = await import("@/lib/api/response");
  return apiOptions(request);
}
