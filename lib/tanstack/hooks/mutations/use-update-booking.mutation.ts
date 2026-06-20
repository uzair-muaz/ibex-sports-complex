"use client";

import { useMutation } from "@tanstack/react-query";
import type { UpdateBookingInput } from "@/app/actions/bookings";
import { useInvalidateBookings } from "@/lib/tanstack/hooks/mutations/use-invalidate-bookings";
import { requestUpdateBooking } from "@/lib/tanstack/requests/bookings.requests";

export function useUpdateBookingMutation() {
  const invalidate = useInvalidateBookings();
  return useMutation({
    mutationFn: (input: UpdateBookingInput) => requestUpdateBooking(input),
    onSuccess: () => invalidate(),
  });
}
