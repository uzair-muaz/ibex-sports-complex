import { requireBffAdmin, bffOk, bffError } from "@/lib/bff/http";
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
import { createTrustedApiActor } from "@/lib/action-auth";

export async function GET(request: Request) {
  const gate = await requireBffAdmin(request);
  if (!gate.ok) return gate.response;
  const staffOpts = createTrustedApiActor(gate.user);

  const { searchParams } = new URL(request.url);
  const discountId = searchParams.get("discountId");
  if (discountId) {
    const result = await getDiscountById(discountId, staffOpts);
    if (!result.success) return bffError(result.error || "Failed", 400, request);
    return bffOk({ discount: result.discount }, request);
  }

  const result = await getDiscounts(staffOpts);
  if (!result.success) return bffError(result.error || "Failed", 400, request);
  return bffOk({ discounts: result.discounts }, request);
}

export async function POST(request: Request) {
  const gate = await requireBffAdmin(request);
  if (!gate.ok) return gate.response;
  const staffOpts = createTrustedApiActor(gate.user);
  const body = await request.json();
  if (body?.action === "toggle") {
    const result = await toggleDiscountActive(body.discountId, staffOpts);
    if (!result.success) return bffError(result.error || "Failed", 400, request);
    return bffOk(result, request);
  }
  const result = await createDiscount(body as CreateDiscountInput, staffOpts);
  if (!result.success) return bffError(result.error || "Failed", 400, request);
  return bffOk(result, request);
}

export async function PATCH(request: Request) {
  const gate = await requireBffAdmin(request);
  if (!gate.ok) return gate.response;
  const staffOpts = createTrustedApiActor(gate.user);
  const body = (await request.json()) as UpdateDiscountInput;
  const result = await updateDiscount(body, staffOpts);
  if (!result.success) return bffError(result.error || "Failed", 400, request);
  return bffOk(result, request);
}

export async function DELETE(request: Request) {
  const gate = await requireBffAdmin(request);
  if (!gate.ok) return gate.response;
  const staffOpts = createTrustedApiActor(gate.user);
  const { searchParams } = new URL(request.url);
  const discountId = searchParams.get("discountId") || "";
  const result = await deleteDiscount(discountId, staffOpts);
  if (!result.success) return bffError(result.error || "Failed", 400, request);
  return bffOk(result, request);
}

export async function OPTIONS(request: Request) {
  const { apiOptions } = await import("@/lib/api/response");
  return apiOptions(request);
}
