import { apiOk, apiError, apiOptions } from "@/lib/api/response";
import { requireApiAdmin } from "@/lib/api/guard";
import { isSuperAdminRole } from "@/lib/authz";
import { createPromo, listPromos } from "@/lib/promo-admin";

/** Staff: all promo codes with how often they were used. */
export async function GET(request: Request) {
  const gate = await requireApiAdmin(request);
  if (!gate.ok) return gate.response;
  return apiOk({ items: await listPromos() }, request, { headers: { "Cache-Control": "no-store" } });
}

/** Super admin: make a promo code. */
export async function POST(request: Request) {
  const gate = await requireApiAdmin(request);
  if (!gate.ok) return gate.response;
  if (!isSuperAdminRole(gate.user.role)) return apiError("Super admin only", 403, request, { code: "FORBIDDEN" });
  const body = await request.json().catch(() => null);
  const r = await createPromo(body, gate.user.id);
  if (!r.ok) return apiError(r.error, r.status, request, { code: r.code });
  return apiOk({ promo: r.promo }, request, { status: 201 });
}

export async function OPTIONS(request: Request) {
  return apiOptions(request);
}
