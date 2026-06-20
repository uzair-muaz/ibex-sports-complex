"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createDiscount,
  deleteDiscount,
  getDiscountById,
  getDiscounts,
  toggleDiscountActive,
  updateDiscount,
  type CreateDiscountInput,
  type UpdateDiscountInput,
} from "@/app/actions/discounts";
import { queryKeys } from "@/lib/query/keys";

export function useDiscounts(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.discounts.list(),
    queryFn: () => getDiscounts(),
    enabled: options?.enabled ?? true,
    select: (result) => (result.success ? result.discounts : []),
  });
}

export function useDiscountById(
  discountId: string | null,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: discountId
      ? queryKeys.discounts.detail(discountId)
      : [...queryKeys.discounts.all, "detail", "idle"],
    queryFn: () => {
      if (!discountId) throw new Error("Missing discount id");
      return getDiscountById(discountId);
    },
    enabled: (options?.enabled ?? true) && !!discountId,
  });
}

function useInvalidateDiscounts() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.discounts.all });
}

export function useCreateDiscountMutation() {
  const invalidate = useInvalidateDiscounts();
  return useMutation({
    mutationFn: (input: CreateDiscountInput) => createDiscount(input),
    onSuccess: () => invalidate(),
  });
}

export function useUpdateDiscountMutation() {
  const invalidate = useInvalidateDiscounts();
  return useMutation({
    mutationFn: (input: UpdateDiscountInput) => updateDiscount(input),
    onSuccess: () => invalidate(),
  });
}

export function useDeleteDiscountMutation() {
  const invalidate = useInvalidateDiscounts();
  return useMutation({
    mutationFn: (discountId: string) => deleteDiscount(discountId),
    onSuccess: () => invalidate(),
  });
}

export function useToggleDiscountActiveMutation() {
  const invalidate = useInvalidateDiscounts();
  return useMutation({
    mutationFn: (discountId: string) => toggleDiscountActive(discountId),
    onSuccess: () => invalidate(),
  });
}
