"use client";

import { useQuery } from "@tanstack/react-query";
import { userKeys } from "@/lib/tanstack/keys";
import { fetchAllUsers } from "@/lib/tanstack/requests/users.requests";

export function useAllUsersQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: userKeys.list(),
    queryFn: fetchAllUsers,
    enabled: options?.enabled ?? true,
  });
}
