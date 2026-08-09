"use client";

import { useMutation } from "@tanstack/react-query";
import type { CreateBookingInput } from "@/app/actions/bookings";
import { useInvalidateBookings } from "@/lib/tanstack/hooks/mutations/use-invalidate-bookings";
import { requestCreateBooking } from "@/lib/tanstack/requests/bookings.requests";

export function useCreateBookingMutation() {
  const invalidate = useInvalidateBookings();
  return useMutation({
    mutationFn: (input: CreateBookingInput) => requestCreateBooking(input),
    onSuccess: () => invalidate(),
  });
}
