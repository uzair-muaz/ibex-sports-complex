"use client";

import { Check } from "lucide-react";
import type { Court, CourtPricingPeriod } from "@/types";
import { getPricePerHourForTime } from "@/lib/pricing-utils";
import { cn } from "@/lib/utils";

export type AdminSelectedSlot = { courtId: string; slotTime: number };

export type AdminCourtSlotCardsProps = {
  courts: Court[];
  timeSlots: number[];
  selectedSlots: AdminSelectedSlot[];
  isSlotBooked: (courtId: string, slotTime: number) => boolean;
  isSlotSelected: (courtId: string, slotTime: number) => boolean;
  isSlotConsecutive: (courtId: string, slotTime: number) => boolean;
  onToggleSlot: (courtId: string, slotTime: number) => void;
  formatTime12: (decimalHour: number) => string;
  formatPeriodTime: (period: CourtPricingPeriod) => string;
};

function AdminSlotCard({
  startLabel,
  endLabel,
  isPeak,
  isBooked,
  isSelected,
  blocked,
  onClick,
}: {
  startLabel: string;
  endLabel: string;
  isPeak: boolean;
  isBooked: boolean;
  isSelected: boolean;
  blocked: boolean;
  onClick: () => void;
}) {
  const disabled = isBooked || blocked;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "relative h-28 rounded-3xl border transition-all duration-300 flex flex-col items-start justify-between p-5 overflow-hidden",
        isBooked &&
          "bg-zinc-900/12 border-white/10 text-zinc-700 cursor-not-allowed opacity-55 bg-[repeating-linear-gradient(-45deg,rgba(255,255,255,0.02)_0px,rgba(255,255,255,0.02)_6px,transparent_6px,transparent_14px)] ring-1 ring-red-500/25",
        !isBooked &&
          isSelected &&
          "bg-[#2DD4BF] border-[#2DD4BF] text-black scale-[0.98] shadow-[0_10px_30px_rgba(45,212,191,0.2)]",
        !isBooked &&
          !isSelected &&
          blocked &&
          "bg-zinc-800/50 border border-zinc-700 cursor-not-allowed opacity-50",
        !isBooked &&
          !isSelected &&
          !blocked &&
          "bg-zinc-900/40 border-white/10 hover:border-white/20 active:scale-95",
      )}
    >
      <div className="flex justify-between w-full items-start">
        <span
          className={cn(
            "text-[10px] font-black uppercase tracking-tighter",
            isSelected ? "text-black/60" : "text-zinc-700",
            isBooked && "text-zinc-600",
          )}
        >
          {isBooked ? "Booked" : "START"}
        </span>
        {isSelected ? <Check size={16} className="text-black" /> : null}
        {isPeak && !isSelected && !isBooked ? (
          <div className="w-1.5 h-1.5 rounded-full bg-amber-400 ring-1 ring-amber-400/40 shrink-0" />
        ) : null}
      </div>
      <div className="flex flex-col items-start">
        <span
          className={cn(
            "text-xl font-black leading-none mb-1 tracking-tighter",
            isSelected ? "text-black" : "text-white",
            isBooked && "text-zinc-500",
            blocked && !isBooked && "text-zinc-400",
          )}
        >
          {startLabel}
        </span>
        <span
          className={cn(
            "text-[9px] font-black uppercase tracking-[0.2em]",
            isSelected ? "text-black/40" : "text-zinc-700",
            isBooked && "text-zinc-600",
          )}
        >
          UNTIL {endLabel}
        </span>
      </div>
    </button>
  );
}

export function AdminCourtSlotCards({
  courts,
  timeSlots,
  selectedSlots,
  isSlotBooked,
  isSlotSelected,
  isSlotConsecutive,
  onToggleSlot,
  formatTime12,
  formatPeriodTime,
}: AdminCourtSlotCardsProps) {
  return (
    <div className="space-y-8">
      {courts.map((court) => (
        <div
          key={court._id}
          className="rounded-3xl border border-white/10 bg-zinc-900/40 p-5 md:p-6 space-y-5 shadow-[0_20px_50px_rgba(0,0,0,0.35)]"
        >
          <div className="space-y-1 pb-4 border-b border-white/10">
            <h3 className="text-lg font-bold text-white tracking-tight">
              {court.name}
            </h3>
            {court.timeBasedPricingEnabled &&
            Array.isArray(court.pricingPeriods) &&
            court.pricingPeriods.length > 0 ? (
              <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:gap-6 pt-1">
                {court.pricingPeriods.map((period: CourtPricingPeriod, idx) => (
                  <p key={idx} className="text-xs text-zinc-400">
                    <span className="font-semibold text-zinc-300">
                      {period.label === "peak" ? "Peak" : "Off-peak"}
                    </span>
                    : PKR {period.pricePerHour.toLocaleString()}/hr{" "}
                    <span className="text-zinc-500">
                      ({formatPeriodTime(period)})
                    </span>
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[#2DD4BF] font-semibold">
                PKR {court.pricePerHour.toLocaleString()}/hr
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {timeSlots.map((slotTime) => {
              const isBooked = isSlotBooked(court._id, slotTime);
              const isSelected = isSlotSelected(court._id, slotTime);
              const isConsecutive = isSlotConsecutive(court._id, slotTime);
              const canSelect = selectedSlots.length === 0 || isConsecutive;
              const blocked = !canSelect && !isSelected;
              const { label } = getPricePerHourForTime(court, slotTime);
              const isPeak = label === "peak";
              return (
                <AdminSlotCard
                  key={`${court._id}-${slotTime}`}
                  startLabel={formatTime12(slotTime)}
                  endLabel={formatTime12(slotTime + 0.5)}
                  isPeak={isPeak}
                  isBooked={isBooked}
                  isSelected={isSelected}
                  blocked={blocked}
                  onClick={() => onToggleSlot(court._id, slotTime)}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
