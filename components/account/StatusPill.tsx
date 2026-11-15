import { cn } from "@/lib/utils";
import type { Tone } from "@/lib/web-booking-labels";

const TONES: Record<Tone, string> = {
  amber: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  green: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
  zinc: "border-white/10 bg-white/5 text-zinc-300",
  red: "border-red-400/30 bg-red-400/10 text-red-300",
  blue: "border-sky-400/30 bg-sky-400/10 text-sky-300",
};

export function StatusPill({ tone, children, className }: { tone: Tone; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium", TONES[tone], className)}>
      {children}
    </span>
  );
}
