"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useMyBookings } from "@/lib/tanstack/hooks/queries";
import { StatusPill } from "@/components/account/StatusPill";
import { GetTheApp } from "@/components/GetTheApp";
import { BOOKING_STATUS_LABEL, PAYMENT_STATUS_LABEL } from "@/lib/web-booking-labels";
import type { MobileBooking } from "@/lib/api/booking-view";
import { cn } from "@/lib/utils";

function whenText(b: MobileBooking): string {
  const start = new Date(b.start);
  const tz = { timeZone: "Asia/Karachi" } as const;
  const day = start.toLocaleDateString("en-GB", { ...tz, weekday: "short", day: "numeric", month: "short" });
  const time = start.toLocaleTimeString("en-US", { ...tz, hour: "numeric", minute: "2-digit" });
  const h = b.durationMinutes / 60;
  return `${day} · ${time} · ${Number.isInteger(h) ? h : h.toFixed(1)} h`;
}

export default function MyBookingsPage() {
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const bookingsQuery = useMyBookings();
  const upcoming = bookingsQuery.data?.upcoming ?? [];
  const past = bookingsQuery.data?.past ?? [];
  const list = tab === "upcoming" ? upcoming : past;

  if (bookingsQuery.isPending) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-[#2DD4BF]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <GetTheApp text="Get a notification when your payment is verified, and a reminder before every match." />
      <div className="inline-flex gap-1 rounded-2xl border border-white/10 bg-zinc-950/80 p-1">
        {(
          [
            ["upcoming", `Upcoming (${upcoming.length})`],
            ["past", `Past (${past.length}${bookingsQuery.data?.morePast ? "+" : ""})`],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              "rounded-xl px-4 py-2 text-sm font-medium transition-colors",
              tab === key ? "bg-[#2DD4BF] text-[#0F172A]" : "text-zinc-400 hover:text-white",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 bg-zinc-950/60 px-6 py-14 text-center text-zinc-400">
          No {tab} bookings.{" "}
          <Link href="/booking" className="text-[#2DD4BF] hover:underline">
            Book a slot
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {list.map((b) => {
            const status = BOOKING_STATUS_LABEL[b.status];
            const needsPayment = b.status === "reserved" && (b.payment.status === "awaiting_proof" || b.payment.status === "rejected");
            return (
              <li key={b.id}>
                <Link
                  href={`/account/bookings/${b.id}`}
                  className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-zinc-950/80 px-5 py-4 shadow-sm transition-colors hover:border-[#2DD4BF]/40 hover:bg-zinc-900/80 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-1">
                    <p className="font-medium text-white">
                      <span className="font-mono text-sm text-[#2DD4BF]">{b.reference}</span> · {b.courtName}
                    </p>
                    <p className="text-sm text-zinc-400">{whenText(b)}</p>
                    <div className="flex flex-wrap gap-2">
                      <StatusPill tone={status.tone}>{status.label}</StatusPill>
                      {needsPayment ? (
                        <StatusPill tone={PAYMENT_STATUS_LABEL[b.payment.status].tone}>
                          {b.payment.status === "rejected" ? "Upload a new screenshot" : "Pay the advance"}
                        </StatusPill>
                      ) : null}
                    </div>
                  </div>
                  <div className="text-sm sm:text-right">
                    <p className="font-semibold text-[#2DD4BF]">PKR {b.price.total.toLocaleString()}</p>
                    {b.status !== "cancelled" && b.payment.balanceDue > 0 ? (
                      <p className="text-xs text-zinc-400">PKR {b.payment.balanceDue.toLocaleString()} still to pay</p>
                    ) : null}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
