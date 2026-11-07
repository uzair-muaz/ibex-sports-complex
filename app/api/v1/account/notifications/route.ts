import { apiOk, apiError, apiOptions } from "@/lib/api/response";
import { requireApiCustomer } from "@/lib/api/guard";
import { listNotifications } from "@/lib/notifications/inbox";

/** My notifications (?limit=&cursor=) and unreadCount for the bell. */
export async function GET(request: Request) {
  const gate = await requireApiCustomer(request);
  if (!gate.ok) return gate.response;
  const url = new URL(request.url);
  const limit = url.searchParams.get("limit");
  const result = await listNotifications({
    userId: gate.user.id,
    cursor: url.searchParams.get("cursor"),
    limit: limit === null ? undefined : Number(limit) || undefined,
  });
  if (!result) return apiError("Invalid cursor", 400, request, { code: "VALIDATION_ERROR" });
  return apiOk(result, request, { headers: { "Cache-Control": "no-store" } });
}

export async function OPTIONS(request: Request) {
  return apiOptions(request);
}
