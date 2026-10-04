import { requireBffAdmin, bffOk, bffError } from "@/lib/bff/http";
import { getAllFeedback } from "@/app/actions/feedback";
import { createTrustedApiActor } from "@/lib/action-auth";

export async function GET(request: Request) {
  const gate = await requireBffAdmin(request);
  if (!gate.ok) return gate.response;
  const staffOpts = createTrustedApiActor(gate.user);
  const result = await getAllFeedback(staffOpts);
  if (!result.success) return bffError(result.error || "Failed", 400, request);
  return bffOk({ feedbacks: result.feedbacks }, request);
}

export async function OPTIONS(request: Request) {
  const { apiOptions } = await import("@/lib/api/response");
  return apiOptions(request);
}
