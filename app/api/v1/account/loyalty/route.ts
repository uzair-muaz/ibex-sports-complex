import { requireBffCustomer, bffOk, bffError } from "@/lib/bff/http";
import { getMyLoyaltySummary } from "@/app/actions/loyalty";
import { createTrustedApiActor } from "@/lib/action-auth";

export async function GET(request: Request) {
  const gate = await requireBffCustomer(request);
  if (!gate.ok) return gate.response;

  const result = await getMyLoyaltySummary(createTrustedApiActor(gate.user));
  if (!result.success) return bffError(result.error || "Failed", 400, request);
  return bffOk(
    {
      balance: result.balance,
      hoursPlayed: result.hoursPlayed,
      pointsPerHour: result.pointsPerHour,
      minRedeem: result.minRedeem,
      transactions: result.transactions,
    },
    request,
  );
}

export async function OPTIONS(request: Request) {
  const { apiOptions } = await import("@/lib/api/response");
  return apiOptions(request);
}
