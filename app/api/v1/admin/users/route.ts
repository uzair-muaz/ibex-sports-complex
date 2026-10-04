import { requireBffAdmin, bffOk, bffError } from "@/lib/bff/http";
import {
  createUser,
  deleteUser,
  getAllUsers,
  updateUser,
  type CreateUserInput,
  type UpdateUserInput,
} from "@/app/actions/users";
import { createTrustedApiActor } from "@/lib/action-auth";

export async function GET(request: Request) {
  const gate = await requireBffAdmin(request);
  if (!gate.ok) return gate.response;
  const staffOpts = createTrustedApiActor(gate.user);
  const result = await getAllUsers(staffOpts);
  if (!result.success) return bffError(result.error || "Failed", 400, request);
  return bffOk({ users: result.users }, request);
}

export async function POST(request: Request) {
  const gate = await requireBffAdmin(request);
  if (!gate.ok) return gate.response;
  const staffOpts = createTrustedApiActor(gate.user);
  const body = (await request.json()) as CreateUserInput;
  const result = await createUser(body, staffOpts);
  if (!result.success) return bffError(result.error || "Failed", 400, request);
  return bffOk(result, request);
}

export async function PATCH(request: Request) {
  const gate = await requireBffAdmin(request);
  if (!gate.ok) return gate.response;
  const staffOpts = createTrustedApiActor(gate.user);
  const body = (await request.json()) as UpdateUserInput;
  const result = await updateUser(body, staffOpts);
  if (!result.success) return bffError(result.error || "Failed", 400, request);
  return bffOk(result, request);
}

export async function DELETE(request: Request) {
  const gate = await requireBffAdmin(request);
  if (!gate.ok) return gate.response;
  const staffOpts = createTrustedApiActor(gate.user);
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId") || "";
  const result = await deleteUser(userId, staffOpts);
  if (!result.success) return bffError(result.error || "Failed", 400, request);
  return bffOk(result, request);
}

export async function OPTIONS(request: Request) {
  const { apiOptions } = await import("@/lib/api/response");
  return apiOptions(request);
}
