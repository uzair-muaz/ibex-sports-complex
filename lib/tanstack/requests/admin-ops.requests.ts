import { bffFetch } from "@/lib/bff/client";

export async function fetchAdminSupportTickets() {
  return bffFetch<{ tickets: unknown[] }>("/api/v1/admin/ops?resource=support");
}

export async function replyAdminSupportTicket(input: {
  ticketId: string;
  message: string;
  close?: boolean;
}) {
  return bffFetch("/api/v1/admin/ops", {
    method: "POST",
    body: JSON.stringify({
      action: "reply-support",
      ticketId: input.ticketId,
      message: input.message,
      close: input.close,
    }),
  });
}

export async function fetchAdminMembershipPlans() {
  return bffFetch<{ plans: unknown[] }>("/api/v1/admin/ops?resource=plans");
}

export type MembershipRosterRow = {
  _id: string;
  name: string;
  email: string;
  phone?: string | null;
  loyaltyBalance: number;
  membership: {
    _id: string;
    planName: string;
    planSlug?: string | null;
    hoursRemaining: number;
    guestPassesRemaining: number;
    validUntil: string;
    status: string;
  } | null;
};

export async function fetchAdminMembershipRoster(input?: {
  search?: string;
  membershipFilter?: "all" | "active" | "none";
  page?: number;
  limit?: number;
}) {
  const params = new URLSearchParams({ resource: "roster" });
  if (input?.search) params.set("search", input.search);
  if (input?.membershipFilter)
    params.set("membershipFilter", input.membershipFilter);
  if (input?.page) params.set("page", String(input.page));
  if (input?.limit) params.set("limit", String(input.limit));
  return bffFetch<{
    rows: MembershipRosterRow[];
    totalCount?: number;
    page?: number;
    limit?: number;
  }>(`/api/v1/admin/ops?${params.toString()}`);
}

export async function activateAdminMembership(input: {
  userId: string;
  planId: string;
  carryForwardHours?: boolean;
}) {
  return bffFetch("/api/v1/admin/ops", {
    method: "POST",
    body: JSON.stringify({
      action: "activate-membership",
      ...input,
    }),
  });
}

export async function adjustAdminLoyalty(input: {
  userId: string;
  delta: number;
  note?: string;
}) {
  return bffFetch<{ balance: number }>("/api/v1/admin/ops", {
    method: "POST",
    body: JSON.stringify({
      action: "adjust-loyalty",
      ...input,
    }),
  });
}