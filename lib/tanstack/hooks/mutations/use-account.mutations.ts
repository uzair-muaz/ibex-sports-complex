"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { accountKeys } from "@/lib/tanstack/keys";
import {
  cancelMyBookingRequest,
  claimBookingsRequest,
  createSupportTicketRequest,
  replySupportTicketRequest,
  updateMyProfileRequest,
} from "@/lib/tanstack/requests/account.requests";

function useInvalidateAccount() {
  const queryClient = useQueryClient();
  return {
    profile: () =>
      queryClient.invalidateQueries({ queryKey: accountKeys.profile() }),
    bookings: () =>
      queryClient.invalidateQueries({ queryKey: accountKeys.bookings() }),
    booking: (id: string) =>
      queryClient.invalidateQueries({ queryKey: accountKeys.booking(id) }),
    loyalty: () =>
      queryClient.invalidateQueries({ queryKey: accountKeys.loyalty() }),
    membership: () =>
      queryClient.invalidateQueries({ queryKey: accountKeys.membership() }),
    support: () =>
      queryClient.invalidateQueries({ queryKey: accountKeys.support() }),
    all: () => queryClient.invalidateQueries({ queryKey: accountKeys.all }),
  };
}

export function useUpdateMyProfileMutation() {
  const invalidate = useInvalidateAccount();
  return useMutation({
    mutationFn: updateMyProfileRequest,
    onSuccess: () => invalidate.profile(),
  });
}

export function useClaimBookingsMutation() {
  const invalidate = useInvalidateAccount();
  return useMutation({
    mutationFn: claimBookingsRequest,
    onSuccess: () => {
      void invalidate.bookings();
    },
  });
}

export function useCancelMyBookingMutation() {
  const invalidate = useInvalidateAccount();
  return useMutation({
    mutationFn: (bookingId: string) => cancelMyBookingRequest(bookingId),
    onSuccess: (_data, bookingId) => {
      void invalidate.booking(bookingId);
      void invalidate.bookings();
      void invalidate.loyalty();
      void invalidate.membership();
    },
  });
}

export function useCreateSupportTicketMutation() {
  const invalidate = useInvalidateAccount();
  return useMutation({
    mutationFn: createSupportTicketRequest,
    onSuccess: () => invalidate.support(),
  });
}

export function useReplySupportTicketMutation() {
  const invalidate = useInvalidateAccount();
  return useMutation({
    mutationFn: (input: { ticketId: string; message: string }) =>
      replySupportTicketRequest(input.ticketId, input.message),
    onSuccess: () => invalidate.support(),
  });
}
