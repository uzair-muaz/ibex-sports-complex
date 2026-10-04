import { requireBffAdmin, bffOk, bffError } from "@/lib/bff/http";
import {
  adminActivateMembership,
  adminListUserMemberships,
  adminListMembershipRoster,
  listMembershipPlans,
} from "@/app/actions/membership";
import { adminAdjustLoyalty } from "@/app/actions/loyalty";
import {
  adminListSupportTickets,
  adminReplySupportTicket,
} from "@/app/actions/support";
import { createTrustedApiActor } from "@/lib/action-auth";

export async function GET(request: Request) {
  const gate = await requireBffAdmin(request);
  if (!gate.ok) return gate.response;
  const staffOpts = createTrustedApiActor(gate.user);

  const { searchParams } = new URL(request.url);
  const resource = searchParams.get("resource") || "plans";

  if (resource === "plans") {
    const result = await listMembershipPlans();
    if (!result.success) return bffError("Failed", 400, request);
    return bffOk({ plans: result.plans }, request);
  }

  if (resource === "roster") {
    const result = await adminListMembershipRoster(
      {
        search: searchParams.get("search") || undefined,
        membershipFilter: (searchParams.get("membershipFilter") as
          | "all"
          | "active"
          | "none"
          | null) || "all",
        page: Number(searchParams.get("page") || 1),
        limit: Number(searchParams.get("limit") || 50),
      },
      staffOpts,
    );
    if (!result.success) return bffError(result.error || "Failed", 400, request);
    return bffOk(
      {
        rows: result.rows,
        totalCount: result.totalCount,
        page: result.page,
        limit: result.limit,
      },
      request,
    );
  }

  if (resource === "user-memberships") {
    const userId = searchParams.get("userId") || "";
    const result = await adminListUserMemberships(userId, staffOpts);
    if (!result.success) return bffError(result.error || "Failed", 400, request);
    return bffOk({ memberships: result.memberships }, request);
  }

  if (resource === "support") {
    const result = await adminListSupportTickets(staffOpts);
    if (!result.success) return bffError(result.error || "Failed", 400, request);
    return bffOk({ tickets: result.tickets }, request);
  }

  return bffError("Unknown resource", 400, request);
}

export async function POST(request: Request) {
  const gate = await requireBffAdmin(request);
  if (!gate.ok) return gate.response;
  const staffOpts = createTrustedApiActor(gate.user);

  const body = await request.json();
  const action = body?.action as string;

  if (action === "activate-membership") {
    const result = await adminActivateMembership(
      {
        userId: body.userId,
        planId: body.planId,
        carryForwardHours: body.carryForwardHours,
      },
      staffOpts,
    );
    if (!result.success) return bffError(result.error || "Failed", 400, request);
    return bffOk(result, request);
  }

  if (action === "adjust-loyalty") {
    const result = await adminAdjustLoyalty(
      {
        userId: body.userId,
        delta: body.delta,
        note: body.note,
      },
      staffOpts,
    );
    if (!result.success) return bffError(result.error || "Failed", 400, request);
    return bffOk(result, request);
  }

  if (action === "reply-support") {
    const result = await adminReplySupportTicket(
      {
        ticketId: body.ticketId,
        message: body.message,
        close: body.close,
      },
      staffOpts,
    );
    if (!result.success) return bffError(result.error || "Failed", 400, request);
    return bffOk(result, request);
  }

  return bffError("Unknown action", 400, request);
}

export async function OPTIONS(request: Request) {
  const { apiOptions } = await import("@/lib/api/response");
  return apiOptions(request);
}