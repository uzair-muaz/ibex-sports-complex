import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-zinc-500 selection:bg-[#2DD4BF] selection:text-[#0F172A] border-zinc-800 h-9 w-full min-w-0 rounded-md border bg-zinc-900 px-3 py-1 text-base text-white shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-[#2DD4BF] focus-visible:ring-[#2DD4BF]/50 focus-visible:ring-[3px]",
        "aria-invalid:border-red-500 aria-invalid:ring-red-500/20 aria-invalid:focus-visible:border-red-500 aria-invalid:focus-visible:ring-red-500/50",
        className
      )}
      {...props}
    />
  );
}

export { Input };
