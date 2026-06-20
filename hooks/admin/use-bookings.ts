"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  checkBookingExtensionAvailability,
  createBooking,
  deleteBooking,
  extendBooking,
  getAllBookings,
  getAvailableStartTimes,
  getBookingsPaginated,
  type CreateBookingInput,
  type ExtendBookingInput,
  type GetAvailableStartTimesInput,
  type GetBookingsPaginatedInput,
  type UpdateBookingInput,
  updateBooking,
} from "@/app/actions/bookings";
import { queryKeys } from "@/lib/query/keys";
import type { Booking } from "@/types";

export function useBookingsPaginated(
  input: GetBookingsPaginatedInput,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: queryKeys.bookings.paginated(input),
    queryFn: () => getBookingsPaginated(input),
    enabled: options?.enabled ?? true,
    select: (result) =>
      result.success
        ? {
            bookings: result.bookings as Booking[],
            totalCount: result.totalCount ?? 0,
            page: result.page,
            limit: result.limit,
          }
        : {
            bookings: [] as Booking[],
            totalCount: 0,
            page: input.page,
            limit: input.limit,
          },
  });
}

export function useAllBookings(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.bookings.list(),
    queryFn: () => getAllBookings(),
    enabled: options?.enabled ?? true,
    select: (result) => (result.success ? (result.bookings as Booking[]) : []),
  });
}

export function useAvailableStartTimes(
  input: GetAvailableStartTimesInput | null,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: input
      ? queryKeys.bookings.availableTimes(input)
      : [...queryKeys.bookings.all, "available-times", "idle"],
    queryFn: () => {
      if (!input) throw new Error("Missing availability input");
      return getAvailableStartTimes(input);
    },
    enabled: (options?.enabled ?? true) && !!input?.courtType && !!input?.date,
    select: (result) =>
      result.success ? (result.startTimes ?? []) : [],
  });
}

export function useBookingExtensionAvailability(
  bookingId: string | null,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: bookingId
      ? queryKeys.bookings.extensionAvailability(bookingId)
      : [...queryKeys.bookings.all, "extension", "idle"],
    queryFn: () => {
      if (!bookingId) throw new Error("Missing booking id");
      return checkBookingExtensionAvailability(bookingId);
    },
    enabled: (options?.enabled ?? true) && !!bookingId,
  });
}

function useInvalidateBookings() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all });
}

export function useCreateBookingMutation() {
  const invalidate = useInvalidateBookings();
  return useMutation({
    mutationFn: (input: CreateBookingInput) => createBooking(input),
    onSuccess: () => invalidate(),
  });
}

export function useUpdateBookingMutation() {
  const invalidate = useInvalidateBookings();
  return useMutation({
    mutationFn: (input: UpdateBookingInput) => updateBooking(input),
    onSuccess: () => invalidate(),
  });
}

export function useDeleteBookingMutation() {
  const invalidate = useInvalidateBookings();
  return useMutation({
    mutationFn: (bookingId: string) => deleteBooking(bookingId),
    onSuccess: () => invalidate(),
  });
}

export function useExtendBookingMutation() {
  const invalidate = useInvalidateBookings();
  return useMutation({
    mutationFn: (input: ExtendBookingInput) => extendBooking(input),
    onSuccess: () => invalidate(),
  });
}
