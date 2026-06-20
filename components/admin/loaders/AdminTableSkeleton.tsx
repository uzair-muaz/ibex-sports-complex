"use client";

import { Skeleton } from "@/components/ui/skeleton";

type AdminTableSkeletonProps = {
  rows?: number;
  columns?: number;
};

export function AdminTableSkeleton({
  rows = 8,
  columns = 6,
}: AdminTableSkeletonProps) {
  return (
    <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: columns }).map((_, index) => (
          <Skeleton key={`head-${index}`} className="h-4 bg-zinc-800" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={`row-${rowIndex}`}
          className="grid gap-3"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton
              key={`cell-${rowIndex}-${colIndex}`}
              className="h-8 bg-zinc-900"
            />
          ))}
        </div>
      ))}
    </div>
  );
}
