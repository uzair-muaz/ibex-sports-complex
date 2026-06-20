"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type AdminPageLoaderProps = {
  label?: string;
  className?: string;
};

export function AdminPageLoader({
  label = "Loading...",
  className,
}: AdminPageLoaderProps) {
  return (
    <div
      className={cn(
        "flex min-h-[320px] flex-col items-center justify-center gap-3 text-zinc-400",
        className,
      )}
    >
      <Loader2 className="h-10 w-10 animate-spin text-[#2DD4BF]" />
      <p className="text-sm">{label}</p>
    </div>
  );
}
