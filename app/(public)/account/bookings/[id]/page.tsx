"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useCancelMyBookingMutation } from "@/lib/tanstack/hooks/mutations";
import { useBookingPolicy, useCancelPreview, useMyBooking } from "@/lib/tanstack/hooks/queries";
import { Button } from "@/components/ui/button";
import { PaymentPanel } from "@/components/account/PaymentPanel";
import { StatusPill } from "@/components/account/StatusPill";
import { BOOKING_STATUS_LABEL, noticeText } from "@/lib/web-booking-labels";
import type { MobileBooking } from "@/lib/api/booking-view";
import type { CancelReason } from "@/lib/api/app-cancel";

const pkr = (n: number) => `PKR ${Math.round(n).toLocaleString()}`;

/** "2026-11-20T18:00:00+05:00" → "Fri, 20 Nov 2026 · 6:00 PM – 7:30 PM" in venue time. */
function whenText(b: MobileBooking): string {
  const start = new Date(b.start);
  const end = new Date(start.getTime() + b.durationMinutes * 60_000);
  const tz = { timeZone: "Asia/Karachi" } as const;
  const day = start.toLocaleDateString("en-GB", { ...tz, weekday: "short", day: "numeric", month: "short", year: "numeric" });
  const t = (d: Date) => d.toLocaleTimeString("en-US", { ...tz, hour: "numeric", minute: "2-digit" });
  return `${day} · ${t(start)} – ${t(end)}`;
}

const REASONS: { value: CancelReason; label: string }[] = [
  { value: "schedule_conflict", label: "My plans changed" },
  { value: "teammate_unavailable", label: "Players can't make it" },
  { value: "weather", label: "Weather" },
  { value: "other", label: "Other reason" },
];

export default function BookingDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = String(params.id);
  const bookingQuery = useMyBooking(bookingId);

  useEffect(() => {
    if (!bookingQuery.error) return;
    toast.error(bookingQuery.error instanceof Error ? bookingQuery.error.message : "Booking not found");
    router.replace("/account/bookings");
  }, [bookingQuery.error, router]);

  if (bookingQuery.isPending || !bookingQuery.data) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-[#2DD4BF]" />
      </div>
    );
  }

  const b = bookingQuery.data.booking;
  const status = BOOKING_STATUS_LABEL[b.status];
  const pr = b.price;

  return (
    <div className="space-y-6">
      <Link href="/account/bookings" className="text-sm text-zinc-400 hover:text-white">
        ← Back to bookings
      </Link>

      <div className="space-y-6 rounded-3xl border border-white/10 bg-zinc-900/60 p-6 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-sm text-[#2DD4BF]">{b.reference}</p>
            <h2 className="text-xl font-bold text-white">{b.courtName}</h2>
            <p className="text-zinc-400">{whenText(b)}</p>
          </div>
          <StatusPill tone={status.tone}>{status.label}</StatusPill>
        </div>
        <p className="text-sm text-zinc-500">
          Show this reference and your name at reception to check in.
        </p>

        <section className="space-y-2 rounded-2xl border border-white/10 bg-zinc-950/60 p-5 text-sm">
          <h3 className="text-lg font-semibold text-white">Price</h3>
          <Line label="Court fee" value={pkr(pr.courtFee)} />
          {pr.promoDiscount > 0 ? <Line label={`Promo ${pr.promoCode ?? ""}`.trim()} value={`− ${pkr(pr.promoDiscount)}`} /> : null}
          {pr.hoursDiscount > 0 ? <Line label={`Membership hours (${b.hoursUsed} h)`} value={`− ${pkr(pr.hoursDiscount)}`} /> : null}
          {pr.pointsDiscount > 0 ? <Line label={`Points (${pr.pointsUsed})`} value={`− ${pkr(pr.pointsDiscount)}`} /> : null}
          <div className="border-t border-white/10 pt-2">
            <Line label="Total" value={pkr(pr.total)} strong />
          </div>
        </section>

        <PaymentPanel booking={b} />

        {b.status === "cancelled" && b.refund ? (
          <p className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-300">
            {pkr(b.refund.amount)} went back to your IBEX wallet for your next booking.
          </p>
        ) : null}

        {b.status === "completed" ? (
          <Link href={`/feedback/${b.id}`} className="inline-block text-sm text-zinc-300 hover:text-white">
            Leave feedback
          </Link>
        ) : null}

        <CancelSection booking={b} />
      </div>
    </div>
  );
}

function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <span className={strong ? "font-semibold text-white" : "text-zinc-400"}>{label}</span>
      <span className={strong ? "font-semibold text-white" : "text-zinc-200"}>{value}</span>
    </div>
  );
}

function CancelSection({ booking }: { booking: MobileBooking }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<CancelReason>("schedule_conflict");
  const policy = useBookingPolicy();
  const preview = useCancelPreview(booking.id, { enabled: open });
  const cancel = useCancelMyBookingMutation();
  const notice = policy.data ? noticeText(policy.data.cancellationNoticeMinutes) : null;

  if (booking.status === "cancelled" || booking.status === "completed") return null;

  if (!booking.cancellation.canCancel) {
    return (
      <p className="text-sm text-zinc-500">
        Online cancelling has closed for this booking{notice ? ` (it closes ${notice} before the start)` : ""}. Contact
        the venue if you need help.
      </p>
    );
  }

  const onCancel = async () => {
    try {
      await cancel.mutateAsync({ id: booking.id, reason });
      toast.success("Booking cancelled");
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not cancel the booking");
    }
  };

  const until = booking.cancellation.cancelUntil
    ? new Date(booking.cancellation.cancelUntil).toLocaleString("en-GB", {
        timeZone: "Asia/Karachi",
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
    : null;
  const pv = preview.data;

  return (
    <div className="space-y-3 rounded-2xl border border-red-500/20 bg-red-500/5 p-4">
      <p className="text-sm text-zinc-400">
        You can cancel online{until ? ` until ${until}` : notice ? ` until ${notice} before the start` : ""}. Money you
        paid goes to your IBEX wallet, and points and membership hours come back.
      </p>
      {open ? (
        <div className="space-y-3">
          {preview.isPending ? (
            <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
          ) : pv ? (
            <ul className="space-y-1 text-sm text-zinc-200">
              <li>To your IBEX wallet: <span className="font-semibold text-white">{pkr(pv.refundAmount)}</span></li>
              {pv.pointsReturned > 0 ? <li>Points back: {pv.pointsReturned}</li> : null}
              {pv.hoursReturned > 0 ? <li>Membership hours back: {pv.hoursReturned} h</li> : null}
            </ul>
          ) : null}
          <label className="block space-y-1 text-sm">
            <span className="text-zinc-400">Why are you cancelling?</span>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as CancelReason)}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-white"
            >
              {REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={cancel.isPending} className="border-white/20">
              Keep booking
            </Button>
            <Button onClick={onCancel} disabled={cancel.isPending || !pv?.canCancel} className="bg-red-600 text-white hover:bg-red-500">
              {cancel.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Confirm cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="outline" onClick={() => setOpen(true)} className="border-red-500/40 text-red-400 hover:bg-red-500/10">
          Cancel booking
        </Button>
      )}
    </div>
  );
}
