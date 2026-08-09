"use client";

import { useQueryClient } from "@tanstack/react-query";
import { userKeys } from "@/lib/tanstack/keys";

export function useInvalidateUsers() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: userKeys.all });
}
