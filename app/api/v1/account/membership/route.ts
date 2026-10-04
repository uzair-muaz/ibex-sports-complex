import { requireBffCustomer, bffOk, bffError } from "@/lib/bff/http";
import {
  getMyMembership,
  listMembershipPlans,
} from "@/app/actions/membership";
import { createTrustedApiActor } from "@/lib/action-auth";

export async function GET(request: Request) {
  const gate = await requireBffCustomer(request);
  if (!gate.ok) return gate.response;

  const [mine, catalog] = await Promise.all([
    getMyMembership(createTrustedApiActor(gate.user)),
    listMembershipPlans(),
  ]);
  if (!mine.success) return bffError(mine.error || "Failed", 400, request);

  return bffOk(
    {
      membership: mine.membership,
      history: mine.history,
      plans: catalog.success ? catalog.plans : [],
    },
    request,
  );
}

export async function OPTIONS(request: Request) {
  const { apiOptions } = await import("@/lib/api/response");
  return apiOptions(request);
}
