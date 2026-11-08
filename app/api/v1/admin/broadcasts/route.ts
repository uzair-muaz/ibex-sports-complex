import { apiOk, apiError, apiOptions } from "@/lib/api/response";
import { requireApiAdmin } from "@/lib/api/guard";
import { isSuperAdminRole } from "@/lib/authz";
import { listBroadcasts, previewBroadcast, sendBroadcast } from "@/lib/broadcast";

/** Staff: messages sent so far (newest first). */
export async function GET(request: Request) {
  const gate = await requireApiAdmin(request);
  if (!gate.ok) return gate.response;
  return apiOk({ items: await listBroadcasts() }, request, { headers: { "Cache-Control": "no-store" } });
}

/**
 * Super admin: send a message to customers (app bell + push).
 * { dryRun: true } only counts who would get it. Sending needs { confirm: true }.
 */
export async function POST(request: Request) {
  const gate = await requireApiAdmin(request);
  if (!gate.ok) return gate.response;
  if (!isSuperAdminRole(gate.user.role)) return apiError("Super admin only", 403, request, { code: "FORBIDDEN" });
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (body?.dryRun === true) {
    const p = await previewBroadcast(body);
    if (!p.ok) return apiError(p.error, p.status, request, { code: p.code });
    return apiOk({ customers: p.customers, withApp: p.withApp, guestBookings: p.guestBookings }, request);
  }
  if (body?.confirm !== true) {
    return apiError("Check who gets it first, then send with confirm: true.", 400, request, { code: "CONFIRM_NEEDED" });
  }
  const r = await sendBroadcast(body, gate.user.id);
  if (!r.ok) return apiError(r.error, r.status, request, { code: r.code });
  return apiOk({ broadcast: r.broadcast }, request, { status: 201 });
}

export async function OPTIONS(request: Request) {
  return apiOptions(request);
}
