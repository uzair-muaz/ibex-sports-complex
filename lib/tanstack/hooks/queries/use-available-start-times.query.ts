"use client";

import { useQuery } from "@tanstack/react-query";
import type { GetAvailableStartTimesInput } from "@/app/actions/bookings";
import { bookingKeys } from "@/lib/tanstack/keys";
import { fetchAvailableStartTimes } from "@/lib/tanstack/requests/bookings.requests";

export function useAvailableStartTimesQuery(
  input: GetAvailableStartTimesInput | null,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: input
      ? bookingKeys.availableTimes(input)
      : [...bookingKeys.all, "available-times", "idle"],
    queryFn: () => {
      if (!input) throw new Error("Missing availability input");
      return fetchAvailableStartTimes(input);
    },
    enabled: (options?.enabled ?? true) && !!input?.courtType && !!input?.date,
  });
}
