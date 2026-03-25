import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { formatLocalDate } from "@/lib/utils";

type BookingDatePickerModalProps = {
  isOpen: boolean;
  onClose: () => void;
  calendarMonthLabel: string;
  goToPreviousMonth: () => void;
  goToNextMonth: () => void;
  calendarDays: Array<Date | null>;
  selectedDate: Date;
  minSelectableDateKey: string;
  onSelectDate: (date: Date) => void;
};

export function BookingDatePickerModal({
  isOpen,
  onClose,
  calendarMonthLabel,
  goToPreviousMonth,
  goToNextMonth,
  calendarDays,
  selectedDate,
  minSelectableDateKey,
  onSelectDate,
}: BookingDatePickerModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-100 flex items-end sm:items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/95 backdrop-blur-xl"
          />
          <motion.div
            initial={{ y: "100%", scale: 0.95 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: "100%", scale: 0.95 }}
            className="relative w-full max-w-md bg-zinc-900 rounded-[3rem] border border-zinc-800 p-8 overflow-hidden shadow-2xl"
          >
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-black text-white tracking-tighter uppercase">
                Select Date
              </h3>
              <button
                onClick={onClose}
                className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-zinc-500 hover:text-white transition-all"
              >
                <X size={24} />
              </button>
            </div>
            <div className="mb-5 flex items-center justify-between">
              <button
                type="button"
                onClick={goToPreviousMonth}
                className="w-10 h-10 rounded-xl border border-zinc-800 bg-zinc-800/40 flex items-center justify-center text-zinc-400 hover:text-white hover:border-zinc-700 transition-all"
                aria-label="Previous month"
              >
                <ChevronLeft size={18} />
              </button>
              <div className="text-sm font-black uppercase tracking-[0.16em] text-zinc-300">
                {calendarMonthLabel}
              </div>
              <button
                type="button"
                onClick={goToNextMonth}
                className="w-10 h-10 rounded-xl border border-zinc-800 bg-zinc-800/40 flex items-center justify-center text-zinc-400 hover:text-white hover:border-zinc-700 transition-all"
                aria-label="Next month"
              >
                <ChevronRight size={18} />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-2 mb-4">
              {["S", "M", "T", "W", "T", "F", "S"].map((d) => (
                <div
                  key={d}
                  className="text-center text-[10px] font-black text-zinc-700 py-2"
                >
                  {d}
                </div>
              ))}
              {calendarDays.map((date, i) =>
                (() => {
                  const isEmptyCell = !date;
                  const isPastDate =
                    !!date && formatLocalDate(date) < minSelectableDateKey;
                  const isSelected =
                    !!date && date.toDateString() === selectedDate.toDateString();
                  return (
                    <button
                      key={i}
                      disabled={isEmptyCell || isPastDate}
                      onClick={() => {
                        if (date && !isPastDate) {
                          onSelectDate(date);
                        }
                      }}
                      className={`h-12 rounded-2xl flex items-center justify-center text-sm font-black transition-all ${
                        isEmptyCell ? "opacity-0 pointer-events-none" : ""
                      } ${
                        isPastDate
                          ? "text-zinc-700 bg-zinc-800/25 border border-zinc-800 opacity-45 cursor-not-allowed"
                          : ""
                      } ${
                        isSelected
                          ? "bg-[#2DD4BF] text-black shadow-[0_0_20px_rgba(45,212,191,0.4)]"
                          : isPastDate
                            ? ""
                            : "text-zinc-500 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      {date?.getDate()}
                    </button>
                  );
                })(),
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
