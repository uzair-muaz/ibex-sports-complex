"use client";

import { useMutation } from "@tanstack/react-query";
import type { UpdateDiscountInput } from "@/app/actions/discounts";
import { useInvalidateDiscounts } from "@/lib/tanstack/hooks/mutations/use-invalidate-discounts";
import { requestUpdateDiscount } from "@/lib/tanstack/requests/discounts.requests";

export function useUpdateDiscountMutation() {
  const invalidate = useInvalidateDiscounts();
  return useMutation({
    mutationFn: (input: UpdateDiscountInput) => requestUpdateDiscount(input),
    onSuccess: () => invalidate(),
  });
}
