"use client";

import { useQueryClient } from "@tanstack/react-query";
import { bookingKeys } from "@/lib/tanstack/keys";

export function useInvalidateBookings() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: bookingKeys.all });
}
