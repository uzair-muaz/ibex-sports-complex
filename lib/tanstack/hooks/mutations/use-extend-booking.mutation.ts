"use client";

import { useMutation } from "@tanstack/react-query";
import type { ExtendBookingInput } from "@/app/actions/bookings";
import { useInvalidateBookings } from "@/lib/tanstack/hooks/mutations/use-invalidate-bookings";
import { requestExtendBooking } from "@/lib/tanstack/requests/bookings.requests";

export function useExtendBookingMutation() {
  const invalidate = useInvalidateBookings();
  return useMutation({
    mutationFn: (input: ExtendBookingInput) => requestExtendBooking(input),
    onSuccess: () => invalidate(),
  });
}
