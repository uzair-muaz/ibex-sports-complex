"use client";

import { Card, Skeleton } from "antd";

type AdminTableSkeletonProps = {
  rows?: number;
  /** Kept for call-site compatibility; Ant Design skeleton is not column-aware. */
  columns?: number;
};

export function AdminTableSkeleton({
  rows = 8,
}: AdminTableSkeletonProps) {
  return (
    <Card bordered={false}>
      <Skeleton active paragraph={{ rows: 1 }} title={{ width: "30%" }} />
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton
          key={`table-row-${index}`}
          active
          title={false}
          paragraph={{ rows: 1, width: "100%" }}
          className="mt-3"
        />
      ))}
    </Card>
  );
}
