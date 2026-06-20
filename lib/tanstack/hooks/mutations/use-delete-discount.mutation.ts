"use client";

import { useMutation } from "@tanstack/react-query";
import { useInvalidateDiscounts } from "@/lib/tanstack/hooks/mutations/use-invalidate-discounts";
import { requestDeleteDiscount } from "@/lib/tanstack/requests/discounts.requests";

export function useDeleteDiscountMutation() {
  const invalidate = useInvalidateDiscounts();
  return useMutation({
    mutationFn: (discountId: string) => requestDeleteDiscount(discountId),
    onSuccess: () => invalidate(),
  });
}
