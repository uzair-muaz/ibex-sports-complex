"use client";

import { useState } from "react";
import Link from "next/link";
import { useMyBookings } from "@/lib/tanstack/hooks/queries";
import { Loader2 } from "lucide-react";
import { formatTime12 } from "@/lib/utils";
import { cn } from "@/lib/utils";

type BookingRow = {
  _id: string;
  date: string;
  startTime: number;
  duration: number;
  status: string;
  totalPrice: number;
  courtId?: { name?: string; type?: string } | string;
};

export default function MyBookingsPage() {
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const bookingsQuery = useMyBookings();
  const upcoming = (bookingsQuery.data?.upcoming ?? []) as BookingRow[];
  const past = (bookingsQuery.data?.past ?? []) as BookingRow[];
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
      <div className="inline-flex gap-1 rounded-2xl border border-white/10 bg-zinc-950/80 p-1">
        {(
          [
            ["upcoming", `Upcoming (${upcoming.length})`],
            ["past", `Past (${past.length})`],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              "rounded-xl px-4 py-2 text-sm font-medium transition-colors",
              tab === key
                ? "bg-[#2DD4BF] text-[#0F172A]"
                : "text-zinc-400 hover:text-white",
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
            const courtName =
              typeof b.courtId === "object" ? b.courtId?.name : "Court";
            return (
              <li key={b._id}>
                <Link
                  href={`/account/bookings/${b._id}`}
                  className="flex flex-col gap-1 rounded-2xl border border-white/10 bg-zinc-950/80 px-5 py-4 shadow-sm transition-colors hover:border-[#2DD4BF]/40 hover:bg-zinc-900/80 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium text-white">
                      {courtName} · {b.date}
                    </p>
                    <p className="text-sm text-zinc-400">
                      {formatTime12(b.startTime)} · {b.duration}h ·{" "}
                      <span className="capitalize">
                        {b.status.replace("_", " ")}
                      </span>
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-[#2DD4BF]">
                    PKR {b.totalPrice.toLocaleString()}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
