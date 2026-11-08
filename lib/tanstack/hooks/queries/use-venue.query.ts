"use client";

import { useQuery } from "@tanstack/react-query";
import { bffFetch } from "@/lib/bff/client";
import { DEFAULT_VENUE, type VenueInfo } from "@/lib/venue-rules";

/**
 * Venue contacts from Admin → App Settings (GET /api/v1/venue).
 * Shows today's values straight away, then the saved ones once loaded.
 */
export function useVenueQuery() {
  const query = useQuery({
    queryKey: ["venue"],
    queryFn: () => bffFetch<VenueInfo>("/api/v1/venue", { cache: "no-store" }),
    staleTime: 5 * 60 * 1000,
  });
  return query.data ?? DEFAULT_VENUE;
}
