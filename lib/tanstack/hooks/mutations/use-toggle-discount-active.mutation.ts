"use client";

import { useMutation } from "@tanstack/react-query";
import { useInvalidateDiscounts } from "@/lib/tanstack/hooks/mutations/use-invalidate-discounts";
import { requestToggleDiscountActive } from "@/lib/tanstack/requests/discounts.requests";

export function useToggleDiscountActiveMutation() {
  const invalidate = useInvalidateDiscounts();
  return useMutation({
    mutationFn: (discountId: string) => requestToggleDiscountActive(discountId),
    onSuccess: () => invalidate(),
  });
}
