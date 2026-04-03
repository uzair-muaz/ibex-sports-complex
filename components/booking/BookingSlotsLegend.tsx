export function BookingSlotsLegend() {
  return (
    <div className="flex flex-wrap gap-6 text-[9px] font-black text-zinc-700 uppercase tracking-[0.2em]">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-zinc-800" />
        Available
      </div>
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-[#2DD4BF]" />
        Selected
      </div>
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-[#2DD4BF]" />
        Peak Slot
      </div>
    </div>
  );
}
