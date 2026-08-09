"use client";

import { useQuery } from "@tanstack/react-query";
import type { CourtType } from "@/types";
import { courtKeys } from "@/lib/tanstack/keys";
import { fetchCourtsByType } from "@/lib/tanstack/requests/courts.requests";

export function useCourtsByTypeQuery(
  type?: CourtType,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: courtKeys.byType(type),
    queryFn: () => fetchCourtsByType(type),
    enabled: (options?.enabled ?? true) && !!type,
  });
}
