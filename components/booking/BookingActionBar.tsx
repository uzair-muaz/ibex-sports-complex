import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Zap } from "lucide-react";
import type { AvailableStartTimeQuote } from "@/app/actions/bookings";

type BookingActionBarProps = {
  selectedQuote: AvailableStartTimeQuote | null;
  selectedCourtLabel: string;
  selectedDateLabel: string;
  selectedDurationMinutes: number;
  selectedTimeRangeLabel: string;
  onBack: () => void;
  onConfirm: () => void;
};

export function BookingActionBar({
  selectedQuote,
  selectedCourtLabel,
  selectedDateLabel,
  selectedDurationMinutes,
  selectedTimeRangeLabel,
  onBack,
  onConfirm,
}: BookingActionBarProps) {
  return (
    <AnimatePresence>
      {selectedQuote && (
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="fixed bottom-0 left-0 right-0 z-60 p-6"
        >
          <div className="w-full max-w-7xl mx-auto bg-zinc-950/98 rounded-[3.5rem] p-8 shadow-[0_-20px_80px_rgba(0,0,0,0.85)] text-white border border-white/10">
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-zinc-400">
                  <Zap size={18} />
                </div>
                <div>
                  <div className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">
                    Sport & Date
                  </div>
                  <div className="text-sm font-semibold tracking-tight">
                    {selectedCourtLabel} • {selectedDateLabel}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">
                  Duration
                </div>
                <div className="text-sm font-semibold tracking-tight">
                  {selectedDurationMinutes} MINS
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mb-8">
              <div>
                <div className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-1">
                  Reservation
                </div>
                <div className="text-xl font-semibold tracking-tight leading-none">
                  {selectedTimeRangeLabel.toUpperCase()}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-1">
                  Total
                </div>
                {selectedQuote.discountAmount > 0 &&
                selectedQuote.originalPrice > selectedQuote.totalPrice ? (
                  <div className="text-right leading-tight">
                    <div className="text-zinc-400 text-sm line-through">
                      PKR {selectedQuote.originalPrice.toLocaleString()}
                    </div>
                    <div className="text-3xl font-semibold tracking-tight leading-none">
                      Total PKR {selectedQuote.totalPrice.toLocaleString()}
                    </div>
                    <div className="mt-1 text-[11px] font-semibold text-emerald-600">
                      {selectedQuote.appliedDiscounts?.length
                        ? `Discount: ${selectedQuote.appliedDiscounts
                            .map((d) => d.name)
                            .join(", ")}`
                        : "Discount applied"}{" "}
                      (Saved PKR {selectedQuote.discountAmount.toLocaleString()}
                      )
                    </div>
                  </div>
                ) : (
                  <div className="text-3xl font-semibold tracking-tight leading-none">
                    Total PKR {selectedQuote.totalPrice.toLocaleString()}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={onBack}
                className="w-16 h-16 rounded-full border border-white/15 flex items-center justify-center text-zinc-400 hover:text-white hover:border-white/25 transition-colors"
              >
                <ChevronLeft size={28} />
              </button>
              <button
                onClick={onConfirm}
                className="flex-1 h-16 rounded-full font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 transition-all active:scale-95 bg-[#2DD4BF] text-[#0F172A] hover:bg-[#14B8A6] shadow-xl"
              >
                CONFIRM BOOKING
                <ChevronRight size={20} className="text-[#0F172A]" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
