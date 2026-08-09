"use client";

import { useMutation } from "@tanstack/react-query";
import type { CreateCourtInput } from "@/app/actions/courts";
import { useInvalidateCourts } from "@/lib/tanstack/hooks/mutations/use-invalidate-courts";
import { requestCreateCourt } from "@/lib/tanstack/requests/courts.requests";

export function useCreateCourtMutation() {
  const invalidate = useInvalidateCourts();
  return useMutation({
    mutationFn: (input: CreateCourtInput) => requestCreateCourt(input),
    onSuccess: () => invalidate(),
  });
}
