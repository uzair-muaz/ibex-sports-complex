"use client";

import { useQuery } from "@tanstack/react-query";
import { BUILT_IN_SPORTS, labelFromSportCode } from "@/lib/sport-rules";

export type SportOption = { sport: string; label: string };

const FALLBACK: SportOption[] = BUILT_IN_SPORTS.map((sport) => ({ sport, label: labelFromSportCode(sport) }));

/**
 * Every sport from Admin → App Settings (hidden ones too), in their order.
 * Shows the built-in four until loaded.
 */
export function useSportListQuery(): SportOption[] {
  const query = useQuery({
    queryKey: ["public", "sport-list"],
    queryFn: async () => {
      const res = await fetch("/api/v1/sports?includeHidden=true", { cache: "no-store" });
      if (!res.ok) throw new Error("Could not load sports");
      const body = (await res.json()) as { sports?: SportOption[]; data?: { sports?: SportOption[] } };
      return (body.sports ?? body.data?.sports ?? []).map((s) => ({ sport: s.sport, label: s.label }));
    },
    staleTime: 60_000,
  });
  return query.data?.length ? query.data : FALLBACK;
}
