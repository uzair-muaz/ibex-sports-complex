import { requireBffCustomer, bffOk, bffError } from "@/lib/bff/http";
import {
  createSupportTicket,
  getMySupportTickets,
} from "@/app/actions/support";
import { createTrustedApiActor } from "@/lib/action-auth";

export async function GET(request: Request) {
  const gate = await requireBffCustomer(request);
  if (!gate.ok) return gate.response;

  const result = await getMySupportTickets(createTrustedApiActor(gate.user));
  if (!result.success) return bffError(result.error || "Failed", 400, request);
  return bffOk({ tickets: result.tickets }, request);
}

export async function POST(request: Request) {
  const gate = await requireBffCustomer(request);
  if (!gate.ok) return gate.response;

  const body = (await request.json().catch(() => ({}))) as {
    topic?: string;
    message?: string;
    bookingId?: string;
  };
  const result = await createSupportTicket(
    {
      topic: body.topic || "",
      message: body.message || "",
      bookingId: body.bookingId,
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
