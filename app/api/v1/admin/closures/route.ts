import { apiOk, apiError, apiOptions } from "@/lib/api/response";
import { audit } from "@/lib/audit";
import { requireApiAdmin } from "@/lib/api/guard";
import { isSuperAdminRole } from "@/lib/authz";
import { createClosure, listClosures } from "@/lib/closure-admin";

/** Staff: closures still to come (?past=1 adds old ones), with how many bookings are inside each. */
export async function GET(request: Request) {
  const gate = await requireApiAdmin(request);
  if (!gate.ok) return gate.response;
  const includePast = new URL(request.url).searchParams.get("past") === "1";
  return apiOk({ items: await listClosures({ includePast }) }, request, { headers: { "Cache-Control": "no-store" } });
}

/** Super admin: close courts for a time. Bookings already inside it stay; the reply says how many. */
export async function POST(request: Request) {
  const gate = await requireApiAdmin(request);
  if (!gate.ok) return gate.response;
  if (!isSuperAdminRole(gate.user.role)) return apiError("Super admin only", 403, request, { code: "FORBIDDEN" });
  const body = await request.json().catch(() => null);
  const r = await createClosure(body, gate.user.id);
  if (!r.ok) return apiError(r.error, r.status, request, { code: r.code });
  const c = r.closure;
  await audit({
    actor: gate.user,
    area: "closures",
    action: "create",
    targetId: c.id,
    targetLabel: c.courts.join(", "),
    summary: `Closed ${c.courts.join(", ")} from ${c.startsAt.slice(0, 16).replace("T", " ")} to ${c.endsAt.slice(0, 16).replace("T", " ")} — ${c.reason}`,
  });
  return apiOk({ closure: r.closure }, request, { status: 201 });
}

export async function OPTIONS(request: Request) {
  return apiOptions(request);
}
