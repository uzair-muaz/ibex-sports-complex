import {
  createUser,
  deleteUser,
  getAllUsers,
  updateUser,
  type CreateUserInput,
  type UpdateUserInput,
} from "@/app/actions/users";
import type { AdminUser } from "@/lib/tanstack/types/users.types";

export async function fetchAllUsers() {
  const result = await getAllUsers();
  if (!result.success) {
    throw new Error(result.error ?? "Failed to fetch users");
  }
  return result.users as AdminUser[];
}

export async function requestCreateUser(input: CreateUserInput) {
  return createUser(input);
}

export async function requestUpdateUser(input: UpdateUserInput) {
  return updateUser(input);
}

export async function requestDeleteUser(userId: string) {
  return deleteUser(userId);
}
