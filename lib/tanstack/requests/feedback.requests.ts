import { getAllFeedback } from "@/app/actions/feedback";
import type { AdminFeedback } from "@/lib/tanstack/types/feedback.types";

export async function fetchAllFeedback() {
  const result = await getAllFeedback();
  if (!result.success) {
    throw new Error(result.error ?? "Failed to fetch feedback");
  }
  return result.feedbacks as AdminFeedback[];
}
