"use client";

import { useQuery } from "@tanstack/react-query";
import { courtKeys } from "@/lib/tanstack/keys";
import { fetchAllCourts } from "@/lib/tanstack/requests/courts.requests";

export function useAllCourtsQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: courtKeys.list(),
    queryFn: fetchAllCourts,
    enabled: options?.enabled ?? true,
  });
}
