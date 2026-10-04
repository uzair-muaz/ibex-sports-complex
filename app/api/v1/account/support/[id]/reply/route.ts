import { requireBffCustomer, bffOk, bffError } from "@/lib/bff/http";
import { replyToMyTicket } from "@/app/actions/support";
import { createTrustedApiActor } from "@/lib/action-auth";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, ctx: Ctx) {
  const gate = await requireBffCustomer(request);
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  const body = (await request.json().catch(() => ({}))) as { message?: string };
  const result = await replyToMyTicket(
    {
      ticketId: id,
      message: body.message || "",
    },
    createTrustedApiActor(gate.user),
  );
  if (!result.success) return bffError(result.error || "Failed", 400, request);
  return bffOk({ ticket: result.ticket }, request);
}

export async function OPTIONS(request: Request) {
  const { apiOptions } = await import("@/lib/api/response");
  return apiOptions(request);
}
