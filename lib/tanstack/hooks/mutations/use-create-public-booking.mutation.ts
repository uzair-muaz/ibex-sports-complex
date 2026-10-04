"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CreateBookingInput } from "@/app/actions/bookings";
import { accountKeys } from "@/lib/tanstack/keys";
import { createPublicBookingRequest } from "@/lib/tanstack/requests/account.requests";

/** Public / customer booking create via /api/v1/bookings. */
export function useCreatePublicBookingMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBookingInput) => createPublicBookingRequest(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: accountKeys.all });
    },
  });
}
