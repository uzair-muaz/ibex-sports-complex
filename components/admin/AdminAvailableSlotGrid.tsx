"use client";

import { CheckOutlined } from "@ant-design/icons";
import { Skeleton } from "antd";
import type { AvailableStartTimeQuote } from "@/app/actions/bookings";
import type { Court } from "@/types";
import { getPricePerHourForTime } from "@/lib/pricing-utils";
import { cn } from "@/lib/utils";

export type AdminAvailableSlotGridProps = {
  quotes: AvailableStartTimeQuote[];
  selectedQuote: AvailableStartTimeQuote | null;
  durationHours: number;
  courts: Court[];
  onSelect: (quote: AvailableStartTimeQuote) => void;
  formatTime12: (decimalHour: number) => string;
  formatEndLabel: (startTime: number, durationHours: number) => string;
  isLoading?: boolean;
  emptyMessage?: string;
};

function QuoteSlotCard({
  quote,
  durationHours,
  isSelected,
  isPeak,
  courts,
  formatTime12,
  formatEndLabel,
  onSelect,
}: {
  quote: AvailableStartTimeQuote;
  durationHours: number;
  isSelected: boolean;
  isPeak: boolean;
  courts: Court[];
  formatTime12: (decimalHour: number) => string;
  formatEndLabel: (startTime: number, durationHours: number) => string;
  onSelect: () => void;
}) {
  const court = courts.find((c) => String(c._id) === String(quote.assignedCourtId));
  const peak =
    isPeak ||
    (court ? getPricePerHourForTime(court, quote.startTime).label === "peak" : false);

  const startLabel = formatTime12(quote.startTime);
  const endLabel = formatEndLabel(quote.startTime, durationHours);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "relative flex h-28 w-full flex-col items-start justify-between overflow-hidden rounded-3xl border p-5 text-left transition-all duration-300",
        isSelected
          ? "scale-[0.98] border-[#2DD4BF] bg-[#2DD4BF] text-black shadow-[0_10px_30px_rgba(45,212,191,0.2)]"
          : "border-white/10 bg-zinc-900/40 hover:border-white/20 active:scale-95",
      )}
    >
      <div className="flex w-full items-start justify-between">
        <span
          className={cn(
            "text-[10px] font-black uppercase tracking-tighter",
            isSelected ? "text-black/60" : "text-zinc-700",
          )}
        >
          START
        </span>
        {isSelected ? <CheckOutlined className="text-black" /> : null}
        {peak && !isSelected ? (
          <div
            className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400 ring-1 ring-amber-400/40"
            title="Peak pricing"
          />
        ) : null}
      </div>
      <div className="flex flex-col items-start">
        <span
          className={cn(
            "mb-1 text-xl font-black leading-none tracking-tighter",
            isSelected ? "text-black" : "text-white",
          )}
        >
          {startLabel}
        </span>
        <span
          className={cn(
            "text-[9px] font-black uppercase tracking-[0.2em]",
            isSelected ? "text-black/40" : "text-zinc-700",
          )}
        >
          UNTIL {endLabel}
        </span>
      </div>
    </button>
  );
}

export function AdminAvailableSlotGrid({
  quotes,
  selectedQuote,
  durationHours,
  courts,
  onSelect,
  formatTime12,
  formatEndLabel,
  isLoading,
  emptyMessage = "No open start times for this date, duration, and court type.",
}: AdminAvailableSlotGridProps) {
  const skeletonCount = 6;

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: skeletonCount }).map((_, index) => (
          <div
            key={`av-skel-${index}`}
            className="h-28 rounded-3xl border border-white/10 bg-zinc-900/40 p-5"
          >
            <Skeleton active paragraph={{ rows: 2 }} title={false} />
          </div>
        ))}
      </div>
    );
  }

  if (quotes.length === 0) {
    return (
      <div className="rounded-3xl border border-white/10 bg-zinc-900/30 px-6 py-10 text-center text-sm text-zinc-400">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {quotes.map((quote) => (
        <QuoteSlotCard
          key={`${quote.startTime}-${quote.assignedCourtId}`}
          quote={quote}
          durationHours={durationHours}
          isSelected={
            selectedQuote !== null &&
            selectedQuote.startTime === quote.startTime &&
            selectedQuote.assignedCourtId === quote.assignedCourtId
          }
          isPeak={false}
          courts={courts}
          formatTime12={formatTime12}
          formatEndLabel={formatEndLabel}
          onSelect={() => onSelect(quote)}
        />
      ))}
    </div>
  );
}
