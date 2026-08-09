export const discountKeys = {
  all: ["discounts"] as const,
  list: () => [...discountKeys.all, "list"] as const,
  detail: (id: string) => [...discountKeys.all, "detail", id] as const,
};
