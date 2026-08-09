"use client";

import { Spin, Typography } from "antd";
import { cn } from "@/lib/utils";

const { Text } = Typography;

type AdminPageLoaderProps = {
  label?: string;
  className?: string;
  minHeight?: number | string;
};

export function AdminPageLoader({
  label = "Loading...",
  className,
  minHeight = 320,
}: AdminPageLoaderProps) {
  return (
    <div
      className={cn("flex flex-col items-center justify-center gap-3", className)}
      style={{ minHeight }}
    >
      <Spin size="large" />
      <Text type="secondary">{label}</Text>
    </div>
  );
}
