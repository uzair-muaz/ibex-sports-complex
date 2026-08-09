"use client";

import { useMutation } from "@tanstack/react-query";
import type { UpdateUserInput } from "@/app/actions/users";
import { useInvalidateUsers } from "@/lib/tanstack/hooks/mutations/use-invalidate-users";
import { requestUpdateUser } from "@/lib/tanstack/requests/users.requests";

export function useUpdateUserMutation() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: (input: UpdateUserInput) => requestUpdateUser(input),
    onSuccess: () => invalidate(),
  });
}
