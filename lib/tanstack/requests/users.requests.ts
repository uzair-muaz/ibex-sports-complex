import { bffFetch } from "@/lib/bff/client";
import type { CreateUserInput, UpdateUserInput } from "@/app/actions/users";
import type { AdminUser } from "@/lib/tanstack/types/users.types";
import type { ActionResult } from "@/lib/tanstack/requests/bookings.requests";

export async function fetchAllUsers() {
  const data = await bffFetch<{ users: AdminUser[] }>("/api/v1/admin/users");
  return data.users;
}

export async function requestCreateUser(input: CreateUserInput) {
  return bffFetch<ActionResult<{ user?: AdminUser }>>("/api/v1/admin/users", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function requestUpdateUser(input: UpdateUserInput) {
  return bffFetch<ActionResult<{ user?: AdminUser }>>("/api/v1/admin/users", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function requestDeleteUser(userId: string) {
  return bffFetch<ActionResult>(
    `/api/v1/admin/users?userId=${encodeURIComponent(userId)}`,
    { method: "DELETE" },
  );
}
