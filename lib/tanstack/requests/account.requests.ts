import type { LoyaltyRules } from "@/lib/app-settings";
import type { MobileBooking } from "@/lib/api/booking-view";
import type { CancelPreview, CancelReason } from "@/lib/api/app-cancel";
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

/** My bookings in the app's shape (reference, plain status, payment). Same data the app shows. */
export async function fetchMyBookings() {
  const res = await bffFetch<{ upcoming: MobileBooking[]; past: { items: MobileBooking[]; nextCursor: string | null } }>(
    "/api/v1/account/bookings?format=app&limit=50",
  );
  return { upcoming: res.upcoming, past: res.past.items, morePast: res.past.nextCursor !== null };
}

export async function fetchMyBooking(id: string) {
  return bffFetch<{ booking: MobileBooking }>(
    `/api/v1/account/bookings/${encodeURIComponent(id)}?format=app`,
  );
}

/** Can I cancel, and what comes back? Nothing changes. */
export async function fetchCancelPreview(id: string) {
  return bffFetch<CancelPreview>(
    `/api/v1/account/bookings/${encodeURIComponent(id)}/cancellation`,
  );
}

/** Cancel the same way as the app: money paid goes to the wallet. */
export async function cancelMyBookingRequest(input: { id: string; reason: CancelReason; note?: string }) {
  return bffFetch<{ booking: MobileBooking }>(
    `/api/v1/account/bookings/${encodeURIComponent(input.id)}/cancel`,
    { method: "POST", body: JSON.stringify({ reason: input.reason, note: input.note || undefined }) },
  );
}

/** Send a bank transfer screenshot (JPG, PNG or PDF, max 5 MB). */
export async function uploadPaymentProofRequest(input: {
  bookingId: string;
  file: File;
  amount: number;
  transferReference?: string;
}) {
  const form = new FormData();
  form.append("file", input.file);
  form.append("amount", String(input.amount));
  if (input.transferReference) form.append("transferReference", input.transferReference);
  // Not bffFetch: the browser must set the multipart Content-Type itself.
  const res = await fetch(`/api/v1/bookings/${encodeURIComponent(input.bookingId)}/payment-proofs`, {
    method: "POST",
    body: form,
    credentials: "include",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { error?: string }).error || `Upload failed (${res.status})`);
  return body as { booking: MobileBooking | null };
}

export async function fetchMyLoyalty() {
  return bffFetch<{
    balance: number;
    hoursPlayed: number;
    pointsPerHour: number;
    minRedeem: number;
    rules?: LoyaltyRules;
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
