"use client";

import { useMutation } from "@tanstack/react-query";
import { useInvalidateUsers } from "@/lib/tanstack/hooks/mutations/use-invalidate-users";
import { requestDeleteUser } from "@/lib/tanstack/requests/users.requests";

export function useDeleteUserMutation() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: (userId: string) => requestDeleteUser(userId),
    onSuccess: () => invalidate(),
  });
}
