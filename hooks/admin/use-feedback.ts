"use client";

import { useQuery } from "@tanstack/react-query";
import { getAllFeedback } from "@/app/actions/feedback";
import { queryKeys } from "@/lib/query/keys";

export type AdminFeedback = {
  _id: string;
  userName: string;
  userEmail: string;
  rating: number;
  courtType?: string;
  comment?: string;
  createdAt: string;
  bookingId: string | { _id?: string };
};

export function useAllFeedback(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.feedback.list(),
    queryFn: () => getAllFeedback(),
    enabled: options?.enabled ?? true,
    select: (result) =>
      result.success ? (result.feedbacks as AdminFeedback[]) : [],
  });
}
