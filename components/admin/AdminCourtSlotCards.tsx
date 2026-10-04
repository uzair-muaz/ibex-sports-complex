"use client";

import { CheckOutlined } from "@ant-design/icons";
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
          "bg-[var(--ant-color-fill-tertiary)] border-[var(--ant-color-border)] text-[var(--ant-color-text-secondary)] cursor-not-allowed opacity-55 bg-[repeating-linear-gradient(-45deg,rgba(0,0,0,0.03)_0px,rgba(0,0,0,0.03)_6px,transparent_6px,transparent_14px)] ring-1 ring-red-500/25",
        !isBooked &&
          isSelected &&
          "bg-[var(--ant-color-primary)] border-[var(--ant-color-primary)] text-[rgba(15,23,42,1)] scale-[0.98] shadow-[0_10px_30px_rgba(45,212,191,0.2)]",
        !isBooked &&
          !isSelected &&
          blocked &&
          "bg-[var(--ant-color-fill-secondary)] border border-[var(--ant-color-border)] cursor-not-allowed opacity-50",
        !isBooked &&
          !isSelected &&
          !blocked &&
          "bg-[var(--ant-color-bg-elevated)] border-[var(--ant-color-border)] hover:border-[var(--ant-color-primary)] active:scale-95",
      )}
    >
      <div className="flex justify-between w-full items-start">
        <span
          className={cn(
            "text-[10px] font-black uppercase tracking-tighter",
            isSelected ? "text-[rgba(15,23,42,0.6)]" : "text-[var(--ant-color-text-secondary)]",
            isBooked && "text-[var(--ant-color-text-secondary)]",
          )}
        >
          {isBooked ? "Booked" : "START"}
        </span>
        {isSelected ? <CheckOutlined style={{ fontSize: 16, color: "rgba(15,23,42,1)" }} /> : null}
        {isPeak && !isSelected && !isBooked ? (
          <div className="w-1.5 h-1.5 rounded-full bg-amber-400 ring-1 ring-amber-400/40 shrink-0" />
        ) : null}
      </div>
      <div className="flex flex-col items-start">
        <span
          className={cn(
            "text-xl font-black leading-none mb-1 tracking-tighter",
            isSelected ? "text-[rgba(15,23,42,1)]" : "text-[var(--ant-color-text)]",
            isBooked && "text-[var(--ant-color-text-secondary)]",
            blocked && !isBooked && "text-[var(--ant-color-text-secondary)]",
          )}
        >
          {startLabel}
        </span>
        <span
          className={cn(
            "text-[9px] font-black uppercase tracking-[0.2em]",
            isSelected ? "text-[rgba(15,23,42,0.4)]" : "text-[var(--ant-color-text-secondary)]",
            isBooked && "text-[var(--ant-color-text-secondary)]",
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
          className="rounded-3xl border border-[var(--ant-color-border)] bg-[var(--ant-color-bg-elevated)] p-5 md:p-6 space-y-5 shadow-[0_8px_24px_rgba(0,0,0,0.08)]"
        >
          <div className="space-y-1 pb-4 border-b border-[var(--ant-color-border)]">
            <h3 className="text-lg font-bold text-[var(--ant-color-text)] tracking-tight">
              {court.name}
            </h3>
            {court.timeBasedPricingEnabled &&
            Array.isArray(court.pricingPeriods) &&
            court.pricingPeriods.length > 0 ? (
              <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:gap-6 pt-1">
                {court.pricingPeriods.map((period: CourtPricingPeriod, idx) => (
                  <p key={idx} className="text-xs text-[var(--ant-color-text-secondary)]">
                    <span className="font-semibold text-[var(--ant-color-text-secondary)]">
                      {period.label === "peak" ? "Peak" : "Off-peak"}
                    </span>
                    : PKR {period.pricePerHour.toLocaleString()}/hr{" "}
                    <span className="text-[var(--ant-color-text-secondary)]">
                      ({formatPeriodTime(period)})
                    </span>
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--ant-color-primary)] font-semibold">
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
