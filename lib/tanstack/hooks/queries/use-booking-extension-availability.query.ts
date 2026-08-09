"use client";

import { useQuery } from "@tanstack/react-query";
import { bookingKeys } from "@/lib/tanstack/keys";
import { fetchBookingExtensionAvailability } from "@/lib/tanstack/requests/bookings.requests";

export function useBookingExtensionAvailabilityQuery(
  bookingId: string | null,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: bookingId
      ? bookingKeys.extensionAvailability(bookingId)
      : [...bookingKeys.all, "extension", "idle"],
    queryFn: () => {
      if (!bookingId) throw new Error("Missing booking id");
      return fetchBookingExtensionAvailability(bookingId);
    },
    enabled: (options?.enabled ?? true) && !!bookingId,
  });
}
