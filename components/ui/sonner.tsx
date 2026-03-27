"use client";

import type { ComponentProps } from "react";
import { Toaster as Sonner } from "sonner";
import { useTheme } from "@/app/theme-provider";

type ToasterProps = ComponentProps<typeof Sonner>;

export function Toaster({ ...props }: ToasterProps) {
  const { theme } = useTheme();

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-zinc-900 group-[.toaster]:text-zinc-100 group-[.toaster]:border-zinc-700 group-[.toaster]:shadow-lg",
          title: "group-[.toast]:text-zinc-50 group-[.toast]:font-semibold",
          description: "group-[.toast]:text-zinc-400",
          success:
            "group-[.toast]:border-emerald-500/35 group-[.toast]:bg-zinc-900",
          error:
            "group-[.toast]:border-red-500/40 group-[.toast]:bg-zinc-900",
          warning:
            "group-[.toast]:border-amber-500/35 group-[.toast]:bg-zinc-900",
        },
      }}
      position="top-center"
      closeButton
      richColors
      {...props}
    />
  );
}
