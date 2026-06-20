"use client";

import { useQuery } from "@tanstack/react-query";
import { feedbackKeys } from "@/lib/tanstack/keys";
import { fetchAllFeedback } from "@/lib/tanstack/requests/feedback.requests";

export function useAllFeedbackQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: feedbackKeys.list(),
    queryFn: fetchAllFeedback,
    enabled: options?.enabled ?? true,
  });
}
