"use client";

import { useMutation } from "@tanstack/react-query";
import type { CreateUserInput } from "@/app/actions/users";
import { useInvalidateUsers } from "@/lib/tanstack/hooks/mutations/use-invalidate-users";
import { requestCreateUser } from "@/lib/tanstack/requests/users.requests";

export function useCreateUserMutation() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: (input: CreateUserInput) => requestCreateUser(input),
    onSuccess: () => invalidate(),
  });
}
