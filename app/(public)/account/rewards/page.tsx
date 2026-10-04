"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchMyLoyalty } from "@/lib/tanstack/requests/account.requests";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function RewardsPage() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<{
    balance: number;
    hoursPlayed: number;
    pointsPerHour: number;
    minRedeem: number;
    transactions: Array<{
      _id: string;
      type: string;
      points: number;
      balanceAfter: number;
      note?: string;
      createdAt: string;
    }>;
  } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const result = await fetchMyLoyalty();
        setSummary({
          balance: result.balance,
          hoursPlayed: result.hoursPlayed,
          pointsPerHour: result.pointsPerHour,
          minRedeem: result.minRedeem,
          transactions: result.transactions as Array<{
            _id: string;
            type: string;
            points: number;
            balanceAfter: number;
            note?: string;
            createdAt: string;
          }>,
        });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading || !summary) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-[#2DD4BF]" />
      </div>
    );
  }

  const canRedeem = summary.balance >= summary.minRedeem;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-3xl border border-white/10 bg-zinc-900/60 p-6">
          <p className="text-xs uppercase tracking-wide text-zinc-500">
            Points balance
          </p>
          <p className="mt-2 text-3xl font-bold text-[#2DD4BF]">
            {summary.balance}
          </p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-zinc-900/60 p-6">
          <p className="text-xs uppercase tracking-wide text-zinc-500">
            Hours played
          </p>
          <p className="mt-2 text-3xl font-bold text-white">
            {summary.hoursPlayed}
          </p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-zinc-900/60 p-6">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Earn rate</p>
          <p className="mt-2 text-lg font-semibold text-white">
            {summary.pointsPerHour} pts / hour
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Redeem from {summary.minRedeem} pts (1 pt = PKR 1), up to 50% off
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-3xl border border-white/10 bg-zinc-900/60 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-semibold text-white">Redeem at checkout</h3>
          <p className="mt-1 text-sm text-zinc-400">
            {canRedeem
              ? "Apply points on your next booking — up to 50% of the post-promo price."
              : `Earn at least ${summary.minRedeem} points before redeeming at checkout.`}
          </p>
        </div>
        <Button
          asChild
          className="bg-[#2DD4BF] text-zinc-950 hover:bg-[#2DD4BF]/90"
        >
          <Link href="/booking">Book a court</Link>
        </Button>
      </div>

      <div className="rounded-3xl border border-white/10 bg-zinc-900/60 p-6">
        <h3 className="mb-4 font-semibold text-white">Recent activity</h3>
        {summary.transactions.length === 0 ? (
          <p className="text-sm text-zinc-400">
            Complete a booking to start earning points.
          </p>
        ) : (
          <ul className="space-y-3">
            {summary.transactions.map((t) => (
              <li
                key={t._id}
                className="flex items-center justify-between border-b border-white/5 pb-3 text-sm last:border-0"
              >
                <div>
                  <p className="capitalize text-white">{t.type}</p>
                  <p className="text-xs text-zinc-500">
                    {t.note || new Date(t.createdAt).toLocaleString()}
                  </p>
                </div>
                <p
                  className={
                    t.points >= 0 ? "text-[#2DD4BF]" : "text-red-400"
                  }
                >
                  {t.points >= 0 ? "+" : ""}
                  {t.points}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
