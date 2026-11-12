import { apiOk, apiError, apiOptions } from "@/lib/api/response";
import { requireApiCustomer } from "@/lib/api/guard";
import { getCancellationPreview } from "@/lib/api/app-cancel";

type Ctx = { params: Promise<{ id: string }> };

/** Can I cancel, and what do I get back? Nothing changes. */
export async function GET(request: Request, ctx: Ctx) {
  const gate = await requireApiCustomer(request);
  if (!gate.ok) return gate.response;
  const { id } = await ctx.params;
  try {
    const preview = await getCancellationPreview(gate.user.id, id);
    if (!preview) return apiError("Booking not found", 404, request, { code: "BOOKING_NOT_FOUND" });
    return apiOk(preview, request, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("GET cancellation:", err);
    return apiError("Could not check the booking", 500, request, { code: "SERVER_ERROR" });
  }
}

export async function OPTIONS(request: Request) {
  return apiOptions(request);
}
