"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Check, Clock, MessageCircle, Phone, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const SPORT: Record<string, string> = { PADEL: "Padel", PICKLEBALL: "Pickleball", FUTSAL: "Futsal", CRICKET: "Cricket" };

type ShownPlan = { name: string; price: number; hours: number; hoursLabel: string; highlight: boolean; features: string[] };

type PublicPlan = {
  id: string;
  name: string;
  price: number;
  validityDays: number;
  badge: string | null;
  hours: { sport: string; hours: number }[];
  features: string[];
  restriction: string | null;
};

function toShownPlan(p: PublicPlan): ShownPlan {
  const total = p.hours.reduce((s, h) => s + h.hours, 0);
  return {
    name: p.name,
    price: p.price,
    hours: total,
    hoursLabel: `${total} hrs · ${p.validityDays} days`,
    highlight: !!p.badge,
    features: [
      ...p.hours.map((h) => `${h.hours}h ${SPORT[h.sport] ?? h.sport}`),
      p.restriction ?? "Full week access",
      ...p.features,
    ],
  };
}

type PlansAnswer = {
  plans: PublicPlan[];
  whatsAppUrl: string | null;
  phone: string | null;
  rules: {
    weekdayAdvanceHours: number;
    weekendAdvanceHours: number;
    carryOverGraceDays: number;
    cancellationNoticeMinutes: number;
  };
};

const hrs = (n: number) => `${n} hour${n === 1 ? "" : "s"}`;

/** Terms built from Admin → App Settings, so they always match the real rules. */
function termsFrom(r: PlansAnswer["rules"]): string[] {
  return [
    "Valid for the number of days shown on each plan, from the date of purchase.",
    `Slot booking must be confirmed at least ${hrs(r.weekdayAdvanceHours)} in advance on weekdays.`,
    `Slot booking must be confirmed at least ${hrs(r.weekendAdvanceHours)} in advance on weekends.`,
    `Unused hours carry forward on renewal (grace ${r.carryOverGraceDays} days after expiry).`,
    `Online cancel allowed until ${hrs(Math.round((r.cancellationNoticeMinutes / 60) * 10) / 10)} before start.`,
    "Membership purchase is currently activated by staff after WhatsApp confirmation (online payments coming soon).",
  ];
}

export const MembershipSection = () => {
  const [getStartedOpen, setGetStartedOpen] = useState(false);
  const plansQuery = useQuery({
    queryKey: ["public", "membership-plans"],
    queryFn: async () => {
      const res = await fetch("/api/v1/membership/plans");
      if (!res.ok) throw new Error("plans");
      return (await res.json()) as PlansAnswer;
    },
    staleTime: 5 * 60_000,
  });
  // Only the plans the super admin made (Admin → Memberships → Plans); nothing written into the page.
  const PLANS: ShownPlan[] = (plansQuery.data?.plans ?? []).map(toShownPlan);
  const TERMS = plansQuery.data ? termsFrom(plansQuery.data.rules) : [];
  const WHATSAPP_URL = plansQuery.data?.whatsAppUrl ?? null;
  const CONTACT_PHONE = plansQuery.data?.phone ?? null;

  return (
    <section className="relative py-12 sm:py-16 md:py-24 lg:py-36 px-4 sm:px-6 overflow-hidden transition-colors duration-500">
      <Dialog open={getStartedOpen} onOpenChange={setGetStartedOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl border-zinc-800 bg-zinc-900 shadow-xl text-center">
          <DialogHeader className="text-center space-y-3">
            <DialogTitle className="text-xl sm:text-2xl font-bold text-white">
              Get Started
            </DialogTitle>
            <DialogDescription className="text-zinc-400 text-base leading-relaxed">
              Sign in to your IBEX account, then message us on WhatsApp. Our team
              activates your membership hours after payment.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <a
              href="/account/membership"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2DD4BF] hover:bg-[#14B8A6] text-[#0F172A] font-semibold py-3 px-4 transition-colors"
            >
              Open membership
            </a>
            {WHATSAPP_URL && (
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-semibold py-3 px-4 transition-colors"
            >
              <MessageCircle className="w-5 h-5" />
              WhatsApp
            </a>
            )}
            {CONTACT_PHONE && (
            <a
              href={`tel:${CONTACT_PHONE}`}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold py-3 px-4 transition-colors border border-zinc-700"
            >
              <Phone className="w-5 h-5" />
              {CONTACT_PHONE}
            </a>
            )}
          </div>
          <p className="text-sm text-zinc-400 pt-1">
            We&apos;re here to help you choose the right plan.
          </p>
        </DialogContent>
      </Dialog>
      <div className="absolute inset-0 bg-[#0a0a0a]" />

      <div className="relative max-w-7xl mx-auto">
        {/* Header */}
        <ScrollReveal range={[0.05, 0.3]}>
          <div className="mb-10 sm:mb-14 md:mb-20 lg:mb-28">
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-[#2DD4BF] font-mono text-xs uppercase tracking-[0.25em] mb-3 sm:mb-5"
            >
              Membership
            </motion.p>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="text-3xl sm:text-4xl md:text-6xl font-bold tracking-tight gradient-text"
            >
              Join the IBEX Community
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.25 }}
              className="mt-4 sm:mt-6 text-base sm:text-lg md:text-xl text-zinc-400 leading-relaxed max-w-2xl"
            >
              Choose the way you play. From flexible hourly bookings to
              comprehensive monthly memberships.
            </motion.p>
          </div>
        </ScrollReveal>

        {/* Cards */}
        {plansQuery.isSuccess && PLANS.length === 0 && (
          <p className="text-zinc-400 text-base">
            New membership plans are coming soon. Message us on WhatsApp to ask about them.
          </p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-5 lg:gap-4">
          {PLANS.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{
                duration: 0.5,
                delay: index * 0.08,
                ease: [0.22, 1, 0.36, 1],
              }}
              className={`relative flex flex-col rounded-2xl border overflow-hidden transition-shadow duration-300 ${
                plan.highlight
                  ? "border-[#2DD4BF] shadow-lg shadow-[#2DD4BF]/10 lg:scale-105 z-10"
                  : "border-zinc-800 hover:shadow-md"
              } bg-zinc-900/80`}
            >
              {plan.highlight && (
                <div className="bg-[#2DD4BF] text-[#0F172A] text-center py-1.5 sm:py-2 text-[10px] sm:text-xs font-bold uppercase tracking-wider">
                  Most Popular
                </div>
              )}

              <div className="flex flex-col flex-1 p-4 sm:p-6 md:p-7">
                <h3 className="text-base sm:text-lg md:text-xl font-bold text-white mb-1">
                  {plan.name}
                </h3>
                <div className="flex items-center gap-2 text-zinc-500 text-xs sm:text-sm mb-4 sm:mb-6">
                  <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  <span>{plan.hoursLabel}</span>
                </div>

                <div className="mb-4 sm:mb-6">
                  <span className="text-2xl sm:text-3xl font-bold text-white">
                    PKR {plan.price.toLocaleString()}
                  </span>
                  <span className="text-zinc-500 text-xs sm:text-sm ml-1">/mo</span>
                </div>

                <div className="mb-4 sm:mb-6">
                  <Button
                    type="button"
                    onClick={() => setGetStartedOpen(true)}
                    className={`w-full rounded-xl h-10 sm:h-11 font-semibold text-xs sm:text-sm cursor-pointer transition-all ${
                      plan.highlight
                        ? "bg-[#2DD4BF] text-[#0F172A] hover:bg-[#14b8a6] shadow-md"
                        : "bg-zinc-800 text-white hover:bg-zinc-700"
                    }`}
                  >
                    Get Started
                  </Button>
                </div>

                <ul className="space-y-2 sm:space-y-3 flex-1">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-center gap-2 text-xs sm:text-sm text-zinc-400"
                    >
                      <Check
                        className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${
                          plan.highlight
                            ? "text-[#2DD4BF]"
                            : "text-zinc-500"
                        }`}
                      />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <p className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-zinc-800 text-[10px] sm:text-xs text-zinc-500 flex items-center gap-1.5">
                  <Zap className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0" />
                  ~PKR {Math.round(plan.price / Math.max(1, plan.hours)).toLocaleString()}/hr
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Terms */}
        {TERMS.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-10 sm:mt-16 md:mt-20 p-4 sm:p-6 md:p-8 rounded-2xl bg-zinc-900/60 border border-zinc-800/80"
        >
          <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
            Terms & conditions
          </h4>
          <ul className="space-y-3">
            {TERMS.map((term, i) => (
              <li
                key={i}
                className="flex items-start gap-3 text-zinc-400 text-sm"
              >
                <Check className="w-4 h-4 text-[#2DD4BF] shrink-0 mt-0.5" />
                <span>{term}</span>
              </li>
            ))}
          </ul>
        </motion.div>
        )}
      </div>
    </section>
  );
};
