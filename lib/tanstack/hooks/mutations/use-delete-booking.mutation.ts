"use client";

import { useMutation } from "@tanstack/react-query";
import { useInvalidateBookings } from "@/lib/tanstack/hooks/mutations/use-invalidate-bookings";
import { requestDeleteBooking } from "@/lib/tanstack/requests/bookings.requests";

export function useDeleteBookingMutation() {
  const invalidate = useInvalidateBookings();
  return useMutation({
    mutationFn: (bookingId: string) => requestDeleteBooking(bookingId),
    onSuccess: () => invalidate(),
  });
}
