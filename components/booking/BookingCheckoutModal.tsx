import { AnimatePresence, motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import Link from "next/link";
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
  isLoggedIn: boolean;
  loyaltyBalance: number;
  maxLoyaltyRedeem: number;
  useLoyalty: boolean;
  loyaltyPointsToRedeem: number;
  hasMembership: boolean;
  membershipHoursRemaining: number;
  guestPassesRemaining: number;
  useMembershipHours: boolean;
  useGuestPass: boolean;
  onUseLoyaltyChange: (value: boolean) => void;
  onLoyaltyPointsChange: (value: number) => void;
  onUseMembershipChange: (value: boolean) => void;
  onUseGuestPassChange: (value: boolean) => void;
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
  isLoggedIn,
  loyaltyBalance,
  maxLoyaltyRedeem,
  useLoyalty,
  loyaltyPointsToRedeem,
  hasMembership,
  membershipHoursRemaining,
  guestPassesRemaining,
  useMembershipHours,
  useGuestPass,
  onUseLoyaltyChange,
  onLoyaltyPointsChange,
  onUseMembershipChange,
  onUseGuestPassChange,
  onClose,
  onFieldChange,
  onSubmit,
}: BookingCheckoutModalProps) {
  const displayTotal = useMembershipHours
    ? 0
    : Math.max(
        0,
        (selectedQuote?.totalPrice || 0) -
          (useLoyalty ? loyaltyPointsToRedeem : 0),
      );

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
            className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-zinc-900/95 rounded-3xl border border-white/10 p-5 md:p-6 space-y-4 shadow-[0_30px_80px_rgba(0,0,0,0.75)]"
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
            {!isLoggedIn ? (
              <p className="text-xs text-zinc-400">
                <Link href="/login" className="text-[#2DD4BF] hover:underline">
                  Sign in
                </Link>{" "}
                to track bookings and earn rewards. Guests can still book below.
              </p>
            ) : null}
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

              {isLoggedIn && hasMembership ? (
                <label className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-zinc-200">
                  <input
                    type="checkbox"
                    checked={useMembershipHours}
                    onChange={(e) => onUseMembershipChange(e.target.checked)}
                    className="mt-1"
                  />
                  <span>
                    Use membership hours ({membershipHoursRemaining}h left) —
                    covers this {durationHours}h slot fully
                    {guestPassesRemaining > 0 ? (
                      <span className="mt-2 flex items-center gap-2 text-xs text-zinc-400">
                        <input
                          type="checkbox"
                          checked={useGuestPass}
                          disabled={!useMembershipHours}
                          onChange={(e) =>
                            onUseGuestPassChange(e.target.checked)
                          }
                        />
                        Use guest pass ({guestPassesRemaining} left)
                      </span>
                    ) : null}
                  </span>
                </label>
              ) : null}

              {isLoggedIn && !useMembershipHours && maxLoyaltyRedeem >= 100 ? (
                <div className="rounded-xl border border-white/10 bg-white/5 p-3 space-y-2 text-sm text-zinc-200">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={useLoyalty}
                      onChange={(e) => onUseLoyaltyChange(e.target.checked)}
                    />
                    Use loyalty points (balance {loyaltyBalance})
                  </label>
                  {useLoyalty ? (
                    <input
                      type="number"
                      min={100}
                      max={maxLoyaltyRedeem}
                      step={1}
                      value={loyaltyPointsToRedeem}
                      onChange={(e) =>
                        onLoyaltyPointsChange(Number(e.target.value) || 0)
                      }
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2"
                    />
                  ) : null}
                </div>
              ) : null}

              <PriceBreakdown
                originalPrice={selectedQuote.originalPrice}
                discounts={selectedQuote.appliedDiscounts}
                discountAmount={selectedQuote.discountAmount}
                totalPrice={displayTotal}
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
