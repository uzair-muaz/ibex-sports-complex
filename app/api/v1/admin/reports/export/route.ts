import { apiError, apiOptions } from "@/lib/api/response";
import { requireApiAdmin } from "@/lib/api/guard";
import { isSuperAdminRole } from "@/lib/authz";
import { EXPORT_KINDS, parseReportRange, type ExportKind } from "@/lib/report-rules";
import { buildExport } from "@/lib/reports";

/** Super admin: download a spreadsheet (CSV). ?kind=bookings|payments|wallet|points|memberships&from=&to= */
export async function GET(request: Request) {
  const gate = await requireApiAdmin(request);
  if (!gate.ok) return gate.response;
  if (!isSuperAdminRole(gate.user.role)) return apiError("Super admin only", 403, request, { code: "FORBIDDEN" });
  const q = new URL(request.url).searchParams;
  const kind = q.get("kind") as ExportKind;
  if (!EXPORT_KINDS.includes(kind)) return apiError(`kind must be one of: ${EXPORT_KINDS.join(", ")}.`, 400, request, { code: "VALIDATION_ERROR" });
  const range = parseReportRange(q.get("from"), q.get("to"));
  if (!range.ok) return apiError(range.error, 400, request, { code: "VALIDATION_ERROR" });
  const { filename, csv } = await buildExport(kind, range.range);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

export async function OPTIONS(request: Request) {
  return apiOptions(request);
}
