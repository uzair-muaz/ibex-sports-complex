import { apiOk, apiError, apiOptions } from "@/lib/api/response";
import { requireApiAdmin } from "@/lib/api/guard";
import { isSuperAdminRole } from "@/lib/authz";
import { savePhoto } from "@/lib/media";

/**
 * Super admin: upload a court or sport photo.
 * multipart/form-data: file (JPG/PNG/WebP, up to 3 MB), kind (court_photo | sport_photo).
 * Returns { id, url }. Put the url in the court's photo or the sport's photo and save.
 */
export async function POST(request: Request) {
  const gate = await requireApiAdmin(request);
  if (!gate.ok) return gate.response;
  if (!isSuperAdminRole(gate.user.role)) {
    return apiError("Only the super admin can upload photos.", 403, request, { code: "FORBIDDEN" });
  }
  const form = await request.formData().catch(() => null);
  if (!form) return apiError("Send multipart/form-data.", 400, request, { code: "VALIDATION_ERROR" });
  const result = await savePhoto({ file: form.get("file"), kind: form.get("kind"), uploadedBy: gate.user.id });
  if (!result.ok) return apiError(result.error, result.status, request, { code: result.code });
  return apiOk({ id: result.id, url: result.url }, request, { status: 201 });
}

export async function OPTIONS(request: Request) {
  return apiOptions(request);
}
