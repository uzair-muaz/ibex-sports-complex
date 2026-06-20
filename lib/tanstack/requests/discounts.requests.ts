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

export async function fetchDiscounts() {
  const result = await getDiscounts();
  if (!result.success) {
    throw new Error(result.error ?? "Failed to fetch discounts");
  }
  return result.discounts;
}

export async function fetchDiscountById(discountId: string) {
  const result = await getDiscountById(discountId);
  if (!result.success) {
    throw new Error(result.error ?? "Failed to fetch discount");
  }
  return result.discount;
}

export async function requestCreateDiscount(input: CreateDiscountInput) {
  return createDiscount(input);
}

export async function requestUpdateDiscount(input: UpdateDiscountInput) {
  return updateDiscount(input);
}

export async function requestDeleteDiscount(discountId: string) {
  return deleteDiscount(discountId);
}

export async function requestToggleDiscountActive(discountId: string) {
  return toggleDiscountActive(discountId);
}
