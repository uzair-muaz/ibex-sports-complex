import { apiOk, apiOptions } from "@/lib/api/response";
import { requireApiCustomer } from "@/lib/api/guard";
import { removeDevice } from "@/lib/notifications/inbox";

/** Remove this phone's push token (on sign out). Always 200. */
export async function DELETE(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const gate = await requireApiCustomer(request);
  if (!gate.ok) return gate.response;
  const { token } = await params;
  await removeDevice({ userId: gate.user.id, pushToken: decodeURIComponent(token) });
  return apiOk({ ok: true }, request);
}

export async function OPTIONS(request: Request) {
  return apiOptions(request);
}
