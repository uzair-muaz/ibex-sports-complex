import { apiOk, apiError, apiOptions } from "@/lib/api/response";
import { requireApiCustomer } from "@/lib/api/guard";
import { markRead } from "@/lib/notifications/inbox";

/** Mark as read. Body: { ids: ["…"] } or { all: true }. Returns the new unreadCount. */
export async function POST(request: Request) {
  const gate = await requireApiCustomer(request);
  if (!gate.ok) return gate.response;
  const body = (await request.json().catch(() => null)) as { ids?: unknown; all?: unknown } | null;
  const result = body ? await markRead({ userId: gate.user.id, ids: body.ids, all: body.all }) : null;
  if (!result) {
    return apiError('Send { "ids": [...] } (up to 100) or { "all": true }.', 400, request, { code: "VALIDATION_ERROR" });
  }
  return apiOk(result, request);
}

export async function OPTIONS(request: Request) {
  return apiOptions(request);
}
