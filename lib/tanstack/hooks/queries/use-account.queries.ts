"use client";

import { useQuery } from "@tanstack/react-query";
import { accountKeys } from "@/lib/tanstack/keys";
import { LIVE_QUERY } from "@/lib/tanstack/live-query";
import {
  fetchCancelPreview,
  fetchMyBooking,
  fetchMyBookings,
  fetchMyLoyalty,
  fetchMyMembership,
  fetchMyProfile,
  fetchMySupportTickets,
} from "@/lib/tanstack/requests/account.requests";

export function useMyProfileQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: accountKeys.profile(),
    queryFn: fetchMyProfile,
    enabled: options?.enabled ?? true,
    ...LIVE_QUERY,
  });
}

export function useMyBookingsQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: accountKeys.bookings(),
    queryFn: fetchMyBookings,
    enabled: options?.enabled ?? true,
    ...LIVE_QUERY,
  });
}

export function useMyBookingQuery(
  bookingId: string | null | undefined,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: accountKeys.booking(bookingId || "missing"),
    queryFn: () => fetchMyBooking(bookingId!),
    enabled: (options?.enabled ?? true) && !!bookingId,
    ...LIVE_QUERY,
  });
}

/** What cancelling would give back. Only loaded when the customer opens the cancel box. */
export function useCancelPreviewQuery(bookingId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [...accountKeys.booking(bookingId), "cancel-preview"],
    queryFn: () => fetchCancelPreview(bookingId),
    enabled: options?.enabled ?? true,
    ...LIVE_QUERY,
  });
}

export function useMyLoyaltyQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: accountKeys.loyalty(),
    queryFn: fetchMyLoyalty,
    enabled: options?.enabled ?? true,
    ...LIVE_QUERY,
  });
}

export function useMyMembershipQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: accountKeys.membership(),
    queryFn: fetchMyMembership,
    enabled: options?.enabled ?? true,
    ...LIVE_QUERY,
  });
}

export function useMySupportTicketsQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: accountKeys.support(),
    queryFn: fetchMySupportTickets,
    enabled: options?.enabled ?? true,
    ...LIVE_QUERY,
  });
}
