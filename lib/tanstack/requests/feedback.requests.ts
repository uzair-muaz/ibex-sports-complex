import { bffFetch } from "@/lib/bff/client";
import type { AdminFeedback } from "@/lib/tanstack/types/feedback.types";

export async function fetchAllFeedback() {
  const data = await bffFetch<{ feedbacks: AdminFeedback[] }>(
    "/api/v1/admin/feedback",
  );
  return data.feedbacks;
}
