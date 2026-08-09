"use client";

import { useQuery } from "@tanstack/react-query";
import { bookingKeys } from "@/lib/tanstack/keys";
import { fetchAllBookings } from "@/lib/tanstack/requests/bookings.requests";

export function useAllBookingsQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: bookingKeys.list(),
    queryFn: fetchAllBookings,
    enabled: options?.enabled ?? true,
  });
}
