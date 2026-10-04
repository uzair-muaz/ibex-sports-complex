"use client";

import { useQuery } from "@tanstack/react-query";
import { courtKeys } from "@/lib/tanstack/keys";
import { LIVE_QUERY } from "@/lib/tanstack/live-query";
import { fetchPublicCourts } from "@/lib/tanstack/requests/courts.requests";

export function usePublicCourtsQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: courtKeys.public(),
    queryFn: () => fetchPublicCourts(),
    enabled: options?.enabled ?? true,
    ...LIVE_QUERY,
  });
}
