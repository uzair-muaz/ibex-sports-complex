import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatTime12 } from "@/lib/utils";
import type { AvailableStartTimeQuote } from "@/app/actions/bookings";

function formatEndTimeWithDay(startTime: number, duration: number) {
  const endAbs = startTime + duration;
  const dayInc = endAbs > 24;
  const endMod = ((endAbs % 24) + 24) % 24;
  return `${formatTime12(endMod)}${dayInc ? " (Next Day)" : ""}`;
}

type BookingSuccessModalProps = {
  open: boolean;
  createdBooking: {
    _id: string;
    courtId?: { name?: string } | string;
    date: string;
    startTime: number;
    duration: number;
    totalPrice: number;
    originalPrice?: number;
    discountAmount?: number;
  } | null;
  selectedQuote: AvailableStartTimeQuote | null;
  onDone: () => void;
};

export function BookingSuccessModal({
  open,
  createdBooking,
  selectedQuote,
  onDone,
}: BookingSuccessModalProps) {
  return (
    <AnimatePresence>
      {open && createdBooking ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-60 flex items-center justify-center px-4 py-4 md:py-8"
        >
          <div className="absolute inset-0 bg-black/85 backdrop-blur-xl" onClick={onDone} />
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative bg-zinc-950/95 border border-white/12 p-4 md:p-6 lg:p-8 rounded-2xl md:rounded-3xl w-full max-w-lg shadow-[0_30px_100px_rgba(0,0,0,0.8)]"
          >
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-[#2DD4BF]/8 rounded-full blur-[90px]" />
            <div className="relative space-y-6 z-10 text-white">
              <div className="text-center space-y-3">
                <div className="w-16 h-16 mx-auto rounded-full bg-[#2DD4BF]/10 border border-[#2DD4BF]/30 flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-[#2DD4BF]" />
                </div>
                <h3 className="text-2xl md:text-3xl font-bold">Booking Confirmed!</h3>
                <p className="text-zinc-400 text-sm md:text-base">
                  Your booking is confirmed. Please pay 50% advance.
                </p>
              </div>

              <div className="bg-zinc-900/80 rounded-xl border border-white/10 p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400 text-sm">Booking ID</span>
                  <span className="text-white font-mono text-sm font-medium">
                    #{createdBooking._id.slice(-8)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400 text-sm">Court</span>
                  <span className="text-white text-sm font-medium">
                    {typeof createdBooking.courtId === "object" &&
                    createdBooking.courtId?.name
                      ? createdBooking.courtId.name
                      : "Court"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400 text-sm">Date</span>
                  <span className="text-white text-sm">
                    {new Date(createdBooking.date).toLocaleDateString("en-US", {
                      weekday: "short",
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400 text-sm">Time</span>
                  <span className="text-white text-sm font-medium">
                    {formatTime12(createdBooking.startTime)} -{" "}
                    {formatEndTimeWithDay(
                      createdBooking.startTime,
                      createdBooking.duration,
                    )}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400 text-sm">Total</span>
                  {(() => {
                    const popupOriginalPrice =
                      Number(
                        createdBooking.originalPrice ??
                          selectedQuote?.originalPrice ??
                          createdBooking.totalPrice,
                      ) || 0;
                    const popupTotalPrice =
                      Number(createdBooking.totalPrice ?? selectedQuote?.totalPrice ?? 0) || 0;
                    const popupDiscountAmount =
                      Number(
                        createdBooking.discountAmount ??
                          selectedQuote?.discountAmount ??
                          0,
                      ) || 0;
                    const hasDiscount =
                      popupDiscountAmount > 0 && popupOriginalPrice > popupTotalPrice;
                    return hasDiscount ? (
                      <div className="text-right">
                        <div className="text-zinc-500 text-xs line-through">
                          PKR {popupOriginalPrice.toLocaleString()}
                        </div>
                        <div className="text-[#2DD4BF] font-semibold">
                          PKR {popupTotalPrice.toLocaleString()}
                        </div>
                      </div>
                    ) : (
                      <span className="text-[#2DD4BF] font-semibold">
                        PKR {popupTotalPrice.toLocaleString()}
                      </span>
                    );
                  })()}
                </div>
              </div>

              <div className="flex gap-3">
                <Button className="flex-1 bg-[#2DD4BF] text-[#0F172A] hover:bg-[#14B8A6]" onClick={onDone}>
                  Done
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
