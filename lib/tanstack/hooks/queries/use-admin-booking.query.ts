"use client";

import { useQuery } from "@tanstack/react-query";
import { bookingKeys } from "@/lib/tanstack/keys";
import { fetchBookingById } from "@/lib/tanstack/requests/bookings.requests";

export function useAdminBookingQuery(
  bookingId: string | null | undefined,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: bookingKeys.detail(bookingId || "missing"),
    queryFn: () => fetchBookingById(bookingId!),
    enabled: (options?.enabled ?? true) && !!bookingId,
  });
}
