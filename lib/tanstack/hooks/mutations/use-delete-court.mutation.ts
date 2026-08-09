"use client";

import { useMutation } from "@tanstack/react-query";
import { useInvalidateCourts } from "@/lib/tanstack/hooks/mutations/use-invalidate-courts";
import { requestDeleteCourt } from "@/lib/tanstack/requests/courts.requests";

export function useDeleteCourtMutation() {
  const invalidate = useInvalidateCourts();
  return useMutation({
    mutationFn: (courtId: string) => requestDeleteCourt(courtId),
    onSuccess: () => invalidate(),
  });
}
