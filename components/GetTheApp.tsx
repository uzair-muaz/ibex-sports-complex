"use client";

import { Smartphone } from "lucide-react";
import { useBookingPolicy } from "@/lib/tanstack/hooks/queries";
import { cn } from "@/lib/utils";

/**
 * "Get the IBEX app" banner with store buttons. Hidden until the super admin
 * adds at least one store link (App Settings → App first).
 */
export function GetTheApp({
  title = "Get the IBEX app",
  text,
  className,
  compact,
}: {
  title?: string;
  /** Why the app is better here, e.g. "Earn reward points on every booking." */
  text: string;
  className?: string;
  compact?: boolean;
}) {
  const policy = useBookingPolicy();
  const links = policy.data?.appFirst;
  if (!links?.playStoreUrl && !links?.appStoreUrl) return null;

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-2xl border border-[#2DD4BF]/30 bg-[#2DD4BF]/10 text-zinc-200 sm:flex-row sm:items-center sm:justify-between",
        compact ? "p-3" : "p-4",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#2DD4BF]/20 text-[#2DD4BF]">
          <Smartphone className="h-5 w-5" />
        </span>
        <span>
          <span className="block text-sm font-semibold text-white">{title}</span>
          <span className="block text-xs text-zinc-300">{text}</span>
        </span>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        {links.playStoreUrl ? <StoreButton href={links.playStoreUrl} label="Google Play" /> : null}
        {links.appStoreUrl ? <StoreButton href={links.appStoreUrl} label="App Store" /> : null}
      </div>
    </div>
  );
}

function StoreButton({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex h-10 items-center rounded-xl bg-white px-4 text-sm font-semibold text-black hover:bg-zinc-200"
    >
      {label}
    </a>
  );
}
