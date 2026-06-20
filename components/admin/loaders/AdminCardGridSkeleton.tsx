"use client";

import { Skeleton } from "@/components/ui/skeleton";

type AdminCardGridSkeletonProps = {
  count?: number;
  columns?: 2 | 3 | 4;
};

export function AdminCardGridSkeleton({
  count = 4,
  columns = 4,
}: AdminCardGridSkeletonProps) {
  const gridClass =
    columns === 2
      ? "grid-cols-1 sm:grid-cols-2"
      : columns === 3
        ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3"
        : "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4";

  return (
    <div className={`grid gap-4 ${gridClass}`}>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={`card-skel-${index}`}
          className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-5"
        >
          <Skeleton className="mb-3 h-4 w-24 bg-zinc-800" />
          <Skeleton className="mb-2 h-8 w-32 bg-zinc-900" />
          <Skeleton className="h-3 w-20 bg-zinc-900" />
        </div>
      ))}
    </div>
  );
}
