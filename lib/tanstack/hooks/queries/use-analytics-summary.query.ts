"use client";

import { useQuery } from "@tanstack/react-query";
import { bookingKeys } from "@/lib/tanstack/keys";
import { fetchAnalyticsSummary } from "@/lib/tanstack/requests/bookings.requests";
import { ANALYTICS_ROLLUP_MAX_AGE_MS } from "@/lib/analytics/freshness";

export function useAnalyticsSummaryQuery(
  input?: { dateFrom?: string | null; dateTo?: string | null },
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: bookingKeys.analytics(input),
    queryFn: () => fetchAnalyticsSummary(input),
    enabled: options?.enabled ?? true,
    // Re-check freshness about hourly (server also rebuilds if stale).
    staleTime: ANALYTICS_ROLLUP_MAX_AGE_MS,
    refetchInterval: ANALYTICS_ROLLUP_MAX_AGE_MS,
  });
}
