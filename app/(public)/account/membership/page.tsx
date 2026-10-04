"use client";

import { useMyMembership } from "@/lib/tanstack/hooks/queries";
import { Button } from "@/components/ui/button";
import { Loader2, MessageCircle } from "lucide-react";

const WHATSAPP_URL = "https://wa.me/923255429429";

export default function MembershipPage() {
  const membershipQuery = useMyMembership();
  const membership = membershipQuery.data?.membership as {
    planId?: { name?: string };
    hoursRemaining?: number;
    guestPassesRemaining?: number;
    validUntil?: string;
  } | null;
  const history = (membershipQuery.data?.history ?? []) as Array<{
    _id: string;
    planId?: { name?: string };
    status: string;
    validFrom: string;
    validUntil: string;
  }>;
  const plans = (membershipQuery.data?.plans ?? []) as Array<{
    _id: string;
    name: string;
    price: number;
    hours: number;
    weekdayOnly?: boolean;
    guestPassesPerPeriod?: number;
  }>;

  if (membershipQuery.isPending) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-[#2DD4BF]" />
      </div>
    );
  }

  const plan = membership?.planId;

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-zinc-900/60 p-6 md:p-8">
        {membership ? (
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-wide text-zinc-500">
              Active membership
            </p>
            <h2 className="text-2xl font-bold text-white">
              {plan?.name || "Plan"}
            </h2>
            <p className="text-zinc-300">
              <span className="text-[#2DD4BF] font-semibold">
                {membership.hoursRemaining}h
              </span>{" "}
              remaining · Guest passes: {membership.guestPassesRemaining}
            </p>
            <p className="text-sm text-zinc-500">
              Valid until{" "}
              {membership.validUntil
                ? new Date(membership.validUntil).toLocaleDateString()
                : "—"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-white">No active membership</h2>
            <p className="text-sm text-zinc-400">
              Purchase offline / WhatsApp, then our team activates your hours in
              admin.
            </p>
            <a href={WHATSAPP_URL} target="_blank" rel="noreferrer">
              <Button className="rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-semibold">
                <MessageCircle className="mr-2 h-4 w-4" />
                Request on WhatsApp
              </Button>
            </a>
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {plans.map((p) => (
          <div
            key={p._id}
            className="rounded-2xl border border-white/10 bg-zinc-950/50 p-5"
          >
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="font-semibold text-white">{p.name}</h3>
              <p className="text-[#2DD4BF] font-bold">
                PKR {p.price.toLocaleString()}
              </p>
            </div>
            <p className="mt-2 text-sm text-zinc-400">
              {p.hours} hours ·{" "}
              {p.weekdayOnly ? "Weekdays only" : "Full week"}
              {p.guestPassesPerPeriod
                ? ` · ${p.guestPassesPerPeriod} guest passes`
                : ""}
            </p>
          </div>
        ))}
      </div>

      {history.length > 0 ? (
        <div className="rounded-3xl border border-white/10 bg-zinc-900/60 p-6">
          <h3 className="mb-4 font-semibold text-white">History</h3>
          <ul className="space-y-2 text-sm text-zinc-400">
            {history.map((h) => (
              <li key={h._id} className="flex justify-between gap-4">
                <span>
                  {h.planId?.name || "Plan"} · {h.status}
                </span>
                <span>
                  {new Date(h.validFrom).toLocaleDateString()} –{" "}
                  {new Date(h.validUntil).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
