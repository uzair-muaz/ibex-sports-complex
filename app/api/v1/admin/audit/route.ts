import { apiOk, apiError, apiOptions } from "@/lib/api/response";
import { requireApiAdmin } from "@/lib/api/guard";
import { isSuperAdminRole } from "@/lib/authz";
import { listAudit } from "@/lib/audit";
import { parseReportRange, rangeMoments } from "@/lib/report-rules";

/**
 * Super admin: who changed what, newest first.
 * ?area=&actorId=&customerId=&targetId=&q=&from=YYYY-MM-DD&to=YYYY-MM-DD&cursor=&limit=
 */
export async function GET(request: Request) {
  const gate = await requireApiAdmin(request);
  if (!gate.ok) return gate.response;
  if (!isSuperAdminRole(gate.user.role)) return apiError("Super admin only", 403, request, { code: "FORBIDDEN" });
  const q = new URL(request.url).searchParams;
  let from: Date | null = null;
  let to: Date | null = null;
  if (q.get("from") || q.get("to")) {
    const range = parseReportRange(q.get("from"), q.get("to"));
    if (!range.ok) return apiError(range.error, 400, request, { code: "VALIDATION_ERROR" });
    ({ start: from, end: to } = rangeMoments(range.range));
  }
  const result = await listAudit({
    area: q.get("area"),
    actorId: q.get("actorId"),
    customerId: q.get("customerId"),
    targetId: q.get("targetId"),
    q: q.get("q"),
    from,
    to,
    cursor: q.get("cursor"),
    limit: Number(q.get("limit")) || 50,
  });
  if (!result) return apiError("Bad cursor", 400, request, { code: "VALIDATION_ERROR" });
  return apiOk(result, request, { headers: { "Cache-Control": "no-store" } });
}

export async function OPTIONS(request: Request) {
  return apiOptions(request);
}
