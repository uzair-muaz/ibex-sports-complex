"use client";

import { useQuery } from "@tanstack/react-query";
import type { GetBookingsPaginatedInput } from "@/app/actions/bookings";
import { bookingKeys } from "@/lib/tanstack/keys";
import { fetchBookingsPaginated } from "@/lib/tanstack/requests/bookings.requests";

export function useBookingsPaginatedQuery(
  input: GetBookingsPaginatedInput,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: bookingKeys.paginated(input),
    queryFn: () => fetchBookingsPaginated(input),
    enabled: options?.enabled ?? true,
  });
}
