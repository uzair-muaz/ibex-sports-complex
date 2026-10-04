import { bffFetch } from "@/lib/bff/client";
import type { CreateBookingInput } from "@/app/actions/bookings";

export async function fetchMyProfile() {
  return bffFetch<{ user: Record<string, unknown> }>(
    "/api/v1/account/profile",
  );
}

export async function updateMyProfileRequest(input: {
  name?: string;
  phone?: string;
}) {
  return bffFetch<{ user: Record<string, unknown> }>(
    "/api/v1/account/profile",
    { method: "PATCH", body: JSON.stringify(input) },
  );
}

export async function setMyPasswordRequest(input: {
  currentPassword?: string;
  newPassword: string;
}) {
  return bffFetch<{ hasPassword: boolean }>("/api/v1/account/password", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function claimBookingsRequest() {
  return bffFetch<{ claimed: number }>("/api/v1/account/claim-bookings", {
    method: "POST",
  });
}

export async function fetchMyBookings() {
  return bffFetch<{ upcoming: unknown[]; past: unknown[] }>(
    "/api/v1/account/bookings",
  );
}

export async function fetchMyBooking(id: string) {
  return bffFetch<{ booking: unknown; canCancel: boolean }>(
    `/api/v1/account/bookings/${encodeURIComponent(id)}`,
  );
}

export async function cancelMyBookingRequest(id: string) {
  return bffFetch<{ success: boolean }>(
    `/api/v1/account/bookings/${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
}

export async function fetchMyLoyalty() {
  return bffFetch<{
    balance: number;
    hoursPlayed: number;
    pointsPerHour: number;
    minRedeem: number;
    transactions: unknown[];
  }>("/api/v1/account/loyalty");
}

export async function fetchMyMembership() {
  return bffFetch<{
    membership: unknown;
    history: unknown[];
    plans: unknown[];
  }>("/api/v1/account/membership");
}

export async function fetchMySupportTickets() {
  return bffFetch<{ tickets: unknown[] }>("/api/v1/account/support");
}

export async function createSupportTicketRequest(input: {
  topic: string;
  message: string;
  bookingId?: string;
}) {
  return bffFetch<{ ticket: unknown }>("/api/v1/account/support", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function replySupportTicketRequest(
  ticketId: string,
  message: string,
) {
  return bffFetch<{ ticket: unknown }>(
    `/api/v1/account/support/${encodeURIComponent(ticketId)}/reply`,
    { method: "POST", body: JSON.stringify({ message }) },
  );
}

export async function createPublicBookingRequest(input: CreateBookingInput) {
  return bffFetch<{
    success: boolean;
    booking?: unknown;
    error?: string;
    emailSent?: boolean;
  }>("/api/v1/bookings", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
