"use client";

import { useMutation } from "@tanstack/react-query";
import type { CreateDiscountInput } from "@/app/actions/discounts";
import { useInvalidateDiscounts } from "@/lib/tanstack/hooks/mutations/use-invalidate-discounts";
import { requestCreateDiscount } from "@/lib/tanstack/requests/discounts.requests";

export function useCreateDiscountMutation() {
  const invalidate = useInvalidateDiscounts();
  return useMutation({
    mutationFn: (input: CreateDiscountInput) => requestCreateDiscount(input),
    onSuccess: () => invalidate(),
  });
}
