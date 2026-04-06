export function BookingSlotsLegend() {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2.5 text-xs font-bold text-zinc-500 uppercase tracking-[0.2em]">
        <div className="w-2.5 h-2.5 rounded-full bg-amber-400 ring-2 ring-amber-400/35 shrink-0" />
        Peak slot
      </div>
      <p className="text-[11px] sm:text-xs font-medium text-zinc-600 normal-case tracking-normal max-w-md leading-snug pl-1">
        This start time is in peak hours (premium hourly rate vs off-peak).
      </p>
    </div>
  );
}
