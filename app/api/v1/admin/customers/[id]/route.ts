import { apiOk, apiError, apiOptions } from "@/lib/api/response";
import { requireApiAdmin } from "@/lib/api/guard";
import { buildCustomerPage } from "@/lib/admin-customer";

/** Staff: one customer's profile, bookings, wallet, points, membership and support tickets. */
export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireApiAdmin(request);
  if (!gate.ok) return gate.response;
  const { id } = await ctx.params;
  try {
    const page = await buildCustomerPage(id);
    if (!page) return apiError("Customer not found", 404, request, { code: "USER_NOT_FOUND" });
    return apiOk(page, request, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("GET /api/v1/admin/customers/[id]:", err);
    return apiError("Could not load the customer", 500, request, { code: "SERVER_ERROR" });
  }
}

export async function OPTIONS(request: Request) {
  return apiOptions(request);
}
