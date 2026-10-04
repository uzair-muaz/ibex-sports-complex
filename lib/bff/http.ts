import { apiError, apiOk, apiOptions } from "@/lib/api/response";
import {
  optionalApiUser,
  requireApiAdmin,
  requireApiCustomer,
} from "@/lib/api/guard";
import type { ApiUser } from "@/lib/api/types";

/** @deprecated Prefer lib/api/* — kept for older imports */
export type BffSessionUser = ApiUser;

export async function getBffSession() {
  // Session-only helper (no Request). Prefer resolveApiUser(request).
  const { auth } = await import("@/lib/auth");
  return auth();
}

export async function requireBffCustomer(request: Request) {
  return requireApiCustomer(request);
}

export async function requireBffAdmin(request: Request) {
  return requireApiAdmin(request);
}

export function bffOk<T>(data: T, request?: Request) {
  return apiOk(data, request);
}

export function bffError(error: string, status = 400, request?: Request) {
  return apiError(error, status, request);
}

export { apiOptions, optionalApiUser };
