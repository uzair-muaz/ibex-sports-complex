import { Check } from "lucide-react";
import type { AvailableStartTimeQuote } from "@/app/actions/bookings";
import { Skeleton } from "@/components/ui/skeleton";

type SlotView = {
  id: string;
  quote: AvailableStartTimeQuote;
  time: string;
  end: string;
  isSelected: boolean;
  isPeak: boolean;
};

type BookingSlotsGridProps = {
  isLoadingAvailability: boolean;
  isSelectedDateToday: boolean;
  slots: SlotView[];
  onSelectQuote: (quote: AvailableStartTimeQuote) => void;
};

function SelectableSlotsEmptyCallout({
  isSelectedDateToday,
}: {
  isSelectedDateToday: boolean;
}) {
  return isSelectedDateToday ? (
    <>
      <p className="text-zinc-200 text-sm font-medium tracking-tight">
        Today&apos;s courts are fully booked.
      </p>
      <p className="text-zinc-500 text-sm mt-2 max-w-md mx-auto leading-relaxed">
        There are no bookable time slots left for today. Please choose another
        day from the calendar to see open times.
      </p>
    </>
  ) : (
    <p className="text-zinc-500 text-sm max-w-md mx-auto leading-relaxed">
      No bookable slots remain for this date and duration. Try another date or
      length of play.
    </p>
  );
}

function SlotCard({
  slot,
  onSelectQuote,
}: {
  slot: SlotView;
  onSelectQuote: (quote: AvailableStartTimeQuote) => void;
}) {
  return (
    <button
      key={slot.id}
      onClick={() => onSelectQuote(slot.quote)}
      className={`relative h-28 rounded-3xl border transition-all duration-300 flex flex-col items-start justify-between p-5 overflow-hidden ${
        slot.isSelected
          ? "bg-[#2DD4BF] border-[#2DD4BF] text-black scale-[0.98] shadow-[0_10px_30px_rgba(45,212,191,0.2)]"
          : "bg-zinc-900/40 border-white/10 hover:border-white/20 active:scale-95"
      }`}
    >
      <div className="flex justify-between w-full items-start">
        <span
          className={`text-[10px] font-black uppercase tracking-tighter ${slot.isSelected ? "text-black/60" : "text-zinc-700"}`}
        >
          START
        </span>
        {slot.isSelected ? <Check size={16} className="text-black" /> : null}
        {slot.isPeak && !slot.isSelected ? (
          <div className="w-1.5 h-1.5 rounded-full bg-amber-400 ring-1 ring-amber-400/40 shrink-0" />
        ) : null}
      </div>
      <div className="flex flex-col items-start">
        <span
          className={`text-xl font-black leading-none mb-1 tracking-tighter ${slot.isSelected ? "text-black" : "text-white"}`}
        >
          {slot.time}
        </span>
        <span
          className={`text-[9px] font-black uppercase tracking-[0.2em] ${slot.isSelected ? "text-black/40" : "text-zinc-700"}`}
        >
          UNTIL {slot.end}
        </span>
      </div>
    </button>
  );
}

export function BookingSlotsGrid({
  isLoadingAvailability,
  isSelectedDateToday,
  slots,
  onSelectQuote,
}: BookingSlotsGridProps) {
  const skeletonCount = 8;

  return (
    <div className="grid grid-cols-2 gap-4">
      {isLoadingAvailability ? (
        <>
          {Array.from({ length: skeletonCount }).map((_, index) => (
            <div
              key={`slot-skeleton-${index}`}
              className="h-28 rounded-3xl border border-white/10 bg-zinc-900/40 p-5"
            >
              <div className="flex h-full flex-col justify-between">
                <div className="flex items-start justify-between">
                  <Skeleton className="h-2.5 w-12 bg-zinc-700/60" />
                  <Skeleton className="h-2.5 w-2.5 rounded-full bg-zinc-700/60" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-6 w-24 bg-zinc-700/60" />
                  <Skeleton className="h-2.5 w-20 bg-zinc-700/60" />
                </div>
              </div>
            </div>
          ))}
        </>
      ) : slots.length === 0 ? (
        <div className="col-span-2 text-center py-10 px-6 bg-zinc-900/20 border border-white/10 rounded-3xl">
          <SelectableSlotsEmptyCallout isSelectedDateToday={isSelectedDateToday} />
        </div>
      ) : (
        slots.map((slot) => (
          <SlotCard key={slot.id} slot={slot} onSelectQuote={onSelectQuote} />
        ))
      )}
    </div>
  );
}
