"use client";

import { useMutation } from "@tanstack/react-query";
import { useInvalidateBookings } from "@/lib/tanstack/hooks/mutations/use-invalidate-bookings";
import { requestRecordBookingPayment } from "@/lib/tanstack/requests/bookings.requests";

/** Staff: record a payment (e.g. the rest paid at the venue) as a new entry. */
export function useRecordBookingPaymentMutation() {
  const invalidate = useInvalidateBookings();
  return useMutation({
    mutationFn: requestRecordBookingPayment,
    onSuccess: () => invalidate(),
  });
}
