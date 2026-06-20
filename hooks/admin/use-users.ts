"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createUser,
  deleteUser,
  getAllUsers,
  updateUser,
  type CreateUserInput,
  type UpdateUserInput,
} from "@/app/actions/users";
import { queryKeys } from "@/lib/query/keys";

export type AdminUser = {
  _id: string;
  email: string;
  name: string;
  role: "super_admin" | "admin" | "user";
  createdAt: string;
};

export function useAllUsers(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.users.list(),
    queryFn: () => getAllUsers(),
    enabled: options?.enabled ?? true,
    select: (result) => (result.success ? (result.users as AdminUser[]) : []),
  });
}

function useInvalidateUsers() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
}

export function useCreateUserMutation() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: (input: CreateUserInput) => createUser(input),
    onSuccess: () => invalidate(),
  });
}

export function useUpdateUserMutation() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: (input: UpdateUserInput) => updateUser(input),
    onSuccess: () => invalidate(),
  });
}

export function useDeleteUserMutation() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: (userId: string) => deleteUser(userId),
    onSuccess: () => invalidate(),
  });
}
