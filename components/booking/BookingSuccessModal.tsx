import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BankDetails } from "@/components/booking/BankDetails";
import { GetTheApp } from "@/components/GetTheApp";
import { usePaymentInstructions } from "@/lib/tanstack/hooks/queries";
import { formatTime12 } from "@/lib/utils";
import { advanceFor, webBookingReference } from "@/lib/web-booking-labels";
import { waHref } from "@/lib/venue-rules";
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
    serialNumber?: number | null;
    status?: string;
    courtId?: { name?: string } | string;
    date: string;
    startTime: number;
    duration: number;
    totalPrice: number;
    originalPrice?: number;
    discountAmount?: number;
  } | null;
  selectedQuote: AvailableStartTimeQuote | null;
  /** From Admin → App Settings; the number is left out until it has loaded. */
  advancePercent?: number | null;
  /** Signed-in customers upload the screenshot on their booking page; guests send it on WhatsApp. */
  isLoggedIn: boolean;
  onDone: () => void;
};

/**
 * Shown right after booking. A booking with something to pay is only
 * *reserved* until the advance is verified (same as the app's "Court Reserved").
 */
export function BookingSuccessModal({
  open,
  createdBooking,
  selectedQuote,
  advancePercent,
  isLoggedIn,
  onDone,
}: BookingSuccessModalProps) {
  const info = usePaymentInstructions({ enabled: open });
  const b = createdBooking;
  const total = Number(b?.totalPrice ?? selectedQuote?.totalPrice ?? 0) || 0;
  const confirmed = b?.status === "confirmed" || total === 0;
  const percent = info.data?.minAdvancePercent ?? advancePercent ?? null;
  const advance = percent === null ? null : advanceFor(total, percent);
  const reference = b ? webBookingReference(b) : "";
  const wa = waHref(info.data?.whatsAppNumber);
  const waText = encodeURIComponent(
    `Hi IBEX, here is the payment screenshot for booking ${reference}${advance ? ` (PKR ${advance.toLocaleString()} advance)` : ""}.`,
  );

  return (
    <AnimatePresence>
      {open && b ? (
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
            className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/12 bg-zinc-950/95 p-4 shadow-[0_30px_100px_rgba(0,0,0,0.8)] md:rounded-3xl md:p-6 lg:p-8"
          >
            <div className="relative z-10 space-y-5 text-white">
              <div className="space-y-2 text-center">
                <div
                  className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${confirmed ? "bg-[#2DD4BF]/15 text-[#2DD4BF]" : "bg-amber-400/15 text-amber-300"}`}
                >
                  {confirmed ? <CheckCircle className="h-8 w-8" /> : <Clock className="h-8 w-8" />}
                </div>
                <h3 className="text-2xl font-bold md:text-3xl">{confirmed ? "Booking confirmed" : "Your court is reserved"}</h3>
                <p className="text-sm text-zinc-400 md:text-base">
                  {confirmed
                    ? "Nothing to pay. See you at the court!"
                    : `Send ${advance !== null ? `the PKR ${advance.toLocaleString()} advance` : "the advance"} by bank transfer. Your booking is confirmed once we verify it.`}
                </p>
              </div>

              <div className="space-y-2 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm">
                <Row label="Booking reference" value={<span className="font-mono text-[#2DD4BF]">{reference}</span>} />
                <Row label="Court" value={typeof b.courtId === "object" && b.courtId?.name ? b.courtId.name : "Court"} />
                <Row
                  label="Date"
                  value={new Date(`${b.date}T00:00:00`).toLocaleDateString("en-GB", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                />
                <Row label="Time" value={`${formatTime12(b.startTime)} – ${formatEndTimeWithDay(b.startTime, b.duration)}`} />
                <Row label="Total" value={<span className="font-semibold">PKR {total.toLocaleString()}</span>} />
                {!confirmed && advance !== null ? (
                  <Row label="Advance to send now" value={<span className="font-semibold text-amber-300">PKR {advance.toLocaleString()}</span>} />
                ) : null}
              </div>

              {!confirmed ? (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-white">Send the advance to</h4>
                  <BankDetails info={info.data} reference={reference} amount={advance ?? 0} />
                  {isLoggedIn ? (
                    <Link
                      href={`/account/bookings/${b._id}`}
                      className="flex h-11 w-full items-center justify-center rounded-xl bg-[#2DD4BF] text-sm font-semibold text-[#0F172A] hover:bg-[#14B8A6]"
                    >
                      Upload payment screenshot
                    </Link>
                  ) : (
                    <div className="space-y-2">
                      {wa ? (
                        <a
                          href={`${wa}?text=${waText}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex h-11 w-full items-center justify-center rounded-xl bg-[#2DD4BF] text-sm font-semibold text-[#0F172A] hover:bg-[#14B8A6]"
                        >
                          Send the screenshot on WhatsApp
                        </a>
                      ) : null}
                      <p className="text-center text-xs text-zinc-400">
                        Or{" "}
                        <Link href="/login?mode=signup&callbackUrl=/account" className="text-[#2DD4BF] hover:underline">
                          create an account
                        </Link>{" "}
                        with the same email to upload it and track your booking.
                      </p>
                    </div>
                  )}
                </div>
              ) : null}

              <GetTheApp compact text="Next time, book in the app: upload your payment in one tap and get match reminders." />

              <Button variant="outline" className="w-full border-white/15" onClick={onDone}>
                {confirmed ? "Done" : "I'll pay later"}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-zinc-400">{label}</span>
      <span className="text-right text-white">{value}</span>
    </div>
  );
}
