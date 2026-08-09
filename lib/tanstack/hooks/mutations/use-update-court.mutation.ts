"use client";

import { useMutation } from "@tanstack/react-query";
import type { UpdateCourtInput } from "@/app/actions/courts";
import { useInvalidateCourts } from "@/lib/tanstack/hooks/mutations/use-invalidate-courts";
import { requestUpdateCourt } from "@/lib/tanstack/requests/courts.requests";

export function useUpdateCourtMutation() {
  const invalidate = useInvalidateCourts();
  return useMutation({
    mutationFn: (input: UpdateCourtInput) => requestUpdateCourt(input),
    onSuccess: () => invalidate(),
  });
}
