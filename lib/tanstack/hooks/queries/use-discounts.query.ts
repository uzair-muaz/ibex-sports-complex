"use client";

import { useQuery } from "@tanstack/react-query";
import { discountKeys } from "@/lib/tanstack/keys";
import {
  fetchDiscountById,
  fetchDiscounts,
} from "@/lib/tanstack/requests/discounts.requests";

export function useDiscountsQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: discountKeys.list(),
    queryFn: fetchDiscounts,
    enabled: options?.enabled ?? true,
  });
}

export function useDiscountByIdQuery(
  discountId: string | null,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: discountId
      ? discountKeys.detail(discountId)
      : [...discountKeys.all, "detail", "idle"],
    queryFn: () => {
      if (!discountId) throw new Error("Missing discount id");
      return fetchDiscountById(discountId);
    },
    enabled: (options?.enabled ?? true) && !!discountId,
  });
}
