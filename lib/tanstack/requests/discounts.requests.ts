import { bffFetch } from "@/lib/bff/client";
import type {
  CreateDiscountInput,
  UpdateDiscountInput,
} from "@/app/actions/discounts";
import type { ActionResult } from "@/lib/tanstack/requests/bookings.requests";

export async function fetchDiscounts() {
  const data = await bffFetch<{ discounts: unknown[] }>(
    "/api/v1/admin/discounts",
  );
  return data.discounts;
}

export async function fetchDiscountById(discountId: string) {
  const data = await bffFetch<{ discount: unknown }>(
    `/api/v1/admin/discounts?discountId=${encodeURIComponent(discountId)}`,
  );
  return data.discount;
}

export async function requestCreateDiscount(input: CreateDiscountInput) {
  return bffFetch<ActionResult<{ discount?: unknown }>>(
    "/api/v1/admin/discounts",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

export async function requestUpdateDiscount(input: UpdateDiscountInput) {
  return bffFetch<ActionResult<{ discount?: unknown }>>(
    "/api/v1/admin/discounts",
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );
}

export async function requestDeleteDiscount(discountId: string) {
  return bffFetch<ActionResult>(
    `/api/v1/admin/discounts?discountId=${encodeURIComponent(discountId)}`,
    { method: "DELETE" },
  );
}

export async function requestToggleDiscountActive(discountId: string) {
  return bffFetch<ActionResult>("/api/v1/admin/discounts", {
    method: "POST",
    body: JSON.stringify({ action: "toggle", discountId }),
  });
}
