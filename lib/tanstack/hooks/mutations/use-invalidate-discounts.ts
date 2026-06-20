"use client";

import { useQueryClient } from "@tanstack/react-query";
import { discountKeys } from "@/lib/tanstack/keys";

export function useInvalidateDiscounts() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: discountKeys.all });
}
