import { apiOk, apiError, apiOptions } from "@/lib/api/response";
import { requireApiAdmin } from "@/lib/api/guard";
import { isSuperAdminRole } from "@/lib/authz";
import { parseReportRange } from "@/lib/report-rules";
import { buildReport } from "@/lib/reports";

/** Super admin: money, wallet, points, memberships and promo codes for ?from=&to= (YYYY-MM-DD). */
export async function GET(request: Request) {
  const gate = await requireApiAdmin(request);
  if (!gate.ok) return gate.response;
  if (!isSuperAdminRole(gate.user.role)) return apiError("Super admin only", 403, request, { code: "FORBIDDEN" });
  const q = new URL(request.url).searchParams;
  const range = parseReportRange(q.get("from"), q.get("to"));
  if (!range.ok) return apiError(range.error, 400, request, { code: "VALIDATION_ERROR" });
  return apiOk(await buildReport(range.range), request, { headers: { "Cache-Control": "no-store" } });
}

export async function OPTIONS(request: Request) {
  return apiOptions(request);
}
