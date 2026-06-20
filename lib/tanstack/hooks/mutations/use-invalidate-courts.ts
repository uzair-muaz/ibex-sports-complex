"use client";

import { useQueryClient } from "@tanstack/react-query";
import { courtKeys } from "@/lib/tanstack/keys";

export function useInvalidateCourts() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: courtKeys.all });
}
