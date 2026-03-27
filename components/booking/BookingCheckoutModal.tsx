import { AnimatePresence, motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { PriceBreakdown } from "@/components/PriceBreakdown";
import type { AvailableStartTimeQuote } from "@/app/actions/bookings";
import { formatDurationHoursLabel } from "@/lib/utils";

type FormData = {
  name: string;
  email: string;
  phone: string;
};

type FormErrors = {
  name?: string;
  email?: string;
  phone?: string;
};

type BookingCheckoutModalProps = {
  open: boolean;
  selectedQuote: AvailableStartTimeQuote | null;
  dateString: string;
  durationHours: number;
  selectedTimeRangeLabel: string;
  errorMessage: string;
  formStatus: "idle" | "loading" | "success" | "error";
  formData: FormData;
  formErrors: FormErrors;
  onClose: () => void;
  onFieldChange: (field: keyof FormData, value: string) => void;
  onSubmit: () => void;
};

export function BookingCheckoutModal({
  open,
  selectedQuote,
  dateString,
  durationHours,
  selectedTimeRangeLabel,
  errorMessage,
  formStatus,
  formData,
  formErrors,
  onClose,
  onFieldChange,
  onSubmit,
}: BookingCheckoutModalProps) {
  return (
    <AnimatePresence>
      {open && selectedQuote && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-120 flex items-center justify-center p-4"
        >
          <div
            className="absolute inset-0 bg-black/88 backdrop-blur-md"
            onClick={onClose}
          />
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            className="relative w-full max-w-2xl bg-zinc-900/95 rounded-3xl border border-white/10 p-5 md:p-6 space-y-4 shadow-[0_30px_80px_rgba(0,0,0,0.75)]"
          >
            <h3 className="text-white text-2xl font-bold tracking-tight">
              Checkout
            </h3>
            <div className="inline-flex flex-wrap items-center gap-2 text-[11px] text-zinc-300">
              <span className="rounded-md bg-white/5 px-2 py-1">
                {dateString}
              </span>
              <span>{selectedTimeRangeLabel}</span>
              <span className="text-zinc-500">•</span>
              <span>{formatDurationHoursLabel(durationHours)}</span>
            </div>
            {errorMessage ? (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">
                {errorMessage}
              </div>
            ) : null}
            <div className="space-y-3.5">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                  Player Name
                </label>
                <input
                  required
                  type="text"
                  value={formData.name}
                  onChange={(e) => onFieldChange("name", e.target.value)}
                  placeholder="Enter full name"
                  className="w-full bg-zinc-900/70 border border-zinc-700 rounded-xl p-4 text-white placeholder:text-zinc-400 outline-none focus:border-[#2DD4BF]/70 focus:ring-2 focus:ring-[#2DD4BF]/20 transition-all"
                />
                {formErrors.name ? (
                  <p className="text-xs text-red-400">{formErrors.name}</p>
                ) : null}
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                  Email Address
                </label>
                <input
                  required
                  type="email"
                  value={formData.email}
                  onChange={(e) => onFieldChange("email", e.target.value)}
                  placeholder="name@example.com"
                  inputMode="email"
                  autoComplete="email"
                  className="w-full bg-zinc-900/70 border border-zinc-700 rounded-xl p-4 text-white placeholder:text-zinc-400 outline-none focus:border-[#2DD4BF]/70 focus:ring-2 focus:ring-[#2DD4BF]/20 transition-all"
                />
                {formErrors.email ? (
                  <p className="text-xs text-red-400">{formErrors.email}</p>
                ) : null}
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                  Phone Number <span className="text-red-400">*</span>
                </label>
                <input
                  required
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => onFieldChange("phone", e.target.value)}
                  placeholder="Phone Number (03XXXXXXXXX)"
                  inputMode="numeric"
                  autoComplete="tel"
                  maxLength={15}
                  className="w-full bg-zinc-900/70 border border-zinc-700 rounded-xl p-4 text-white placeholder:text-zinc-400 outline-none focus:border-[#2DD4BF]/70 focus:ring-2 focus:ring-[#2DD4BF]/20 transition-all"
                />
                {formErrors.phone ? (
                  <p className="text-xs text-red-400">{formErrors.phone}</p>
                ) : null}
              </div>
              <PriceBreakdown
                originalPrice={selectedQuote.originalPrice}
                discounts={selectedQuote.appliedDiscounts}
                discountAmount={selectedQuote.discountAmount}
                totalPrice={selectedQuote.totalPrice}
                className="w-full"
              />
              <div className="pt-1 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={formStatus === "loading"}
                  className="h-12 rounded-xl bg-transparent border border-transparent text-zinc-300 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={formStatus === "loading"}
                  onClick={onSubmit}
                  className="h-12 rounded-xl bg-[#2DD4BF] text-[#0F172A] font-semibold text-sm flex items-center justify-center gap-2 hover:bg-[#14B8A6] transition-colors"
                >
                  {formStatus === "loading" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : null}
                  {formStatus === "loading"
                    ? "Processing..."
                    : "Confirm Booking"}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
