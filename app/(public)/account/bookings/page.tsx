"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchMyBookings } from "@/lib/tanstack/requests/account.requests";
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
  const [loading, setLoading] = useState(true);
  const [upcoming, setUpcoming] = useState<BookingRow[]>([]);
  const [past, setPast] = useState<BookingRow[]>([]);

  useEffect(() => {
    (async () => {
      const result = await fetchMyBookings();
      setUpcoming(result.upcoming as BookingRow[]);
      setPast(result.past as BookingRow[]);
      setLoading(false);
    })();
  }, []);

  const list = tab === "upcoming" ? upcoming : past;

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-[#2DD4BF]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
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
              "rounded-xl px-4 py-2 text-sm font-medium",
              tab === key
                ? "bg-[#2DD4BF] text-[#0F172A]"
                : "bg-white/5 text-zinc-300",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-zinc-900/60 p-10 text-center text-zinc-400">
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
                  className="flex flex-col gap-1 rounded-2xl border border-white/10 bg-zinc-900/60 px-5 py-4 transition-colors hover:border-[#2DD4BF]/40 sm:flex-row sm:items-center sm:justify-between"
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
