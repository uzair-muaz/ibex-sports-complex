"use client";

import { motion } from "framer-motion";
import { TextReveal } from "@/components/ui/TextReveal";
import { Check, Sparkles } from "lucide-react";
import { LUXURY_EASE, CARD_ENTRANCE } from "@/lib/motion";

const PLANS = [
  {
    name: "Bronze",
    price: 52500,
    hours: 15,
    highlight: false,
    accent: "from-amber-700/80 to-amber-900/60",
    borderGlow: "group-hover:shadow-amber-500/10",
  },
  {
    name: "Silver",
    price: 76800,
    hours: 24,
    highlight: false,
    accent: "from-zinc-400/80 to-zinc-600/60",
    borderGlow: "group-hover:shadow-zinc-400/10",
  },
  {
    name: "Gold",
    price: 96000,
    hours: 32,
    highlight: true,
    accent: "from-[#2DD4BF]/90 to-[#14b8a6]/80",
    borderGlow: "group-hover:shadow-[#2DD4BF]/20",
  },
  {
    name: "Platinum",
    price: 112000,
    hours: 40,
    highlight: false,
    accent: "from-slate-400/80 to-slate-600/60",
    borderGlow: "group-hover:shadow-slate-400/10",
  },
];

const TERMS = [
  "Valid for one month from date of purchase.",
  "Slot booking must be confirmed at least 2 hours in advance on weekdays.",
  "Slot booking must be confirmed at least 1 day in advance on weekends.",
  "Unused hours carry forward upon membership renewal or extension.",
];

export const MembershipSection = () => {
  return (
    <section className="relative py-28 px-6 overflow-hidden transition-colors duration-200">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#F5F4F2] via-[#FAF9F7] to-[#FAF9F7] dark:from-[#0A0A0A] dark:via-[#080808] dark:to-[#050505]" />
      <div
        className="absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-[#2DD4BF]/8 dark:bg-[#2DD4BF]/5 blur-3xl"
        aria-hidden
      />
      <div
        className="absolute bottom-1/4 -right-32 w-80 h-80 rounded-full bg-[#2DD4BF]/6 dark:bg-[#2DD4BF]/4 blur-3xl"
        aria-hidden
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(45,212,191,0.06),transparent)] dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(45,212,191,0.04),transparent)]" />

      <div className="relative max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-20 text-center md:text-left">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: LUXURY_EASE }}
            className="inline-flex items-center gap-2 rounded-full border border-[#2DD4BF]/30 bg-[#2DD4BF]/5 dark:bg-[#2DD4BF]/10 px-4 py-1.5 mb-6"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#2DD4BF]" />
            <span className="text-xs font-medium uppercase tracking-wider text-[#14b8a6] dark:text-[#2DD4BF]">
              Membership
            </span>
          </motion.div>
          <TextReveal className="text-5xl md:text-7xl font-bold tracking-tighter gradient-text">
            MONTHLY PLANS
          </TextReveal>
          <p className="mt-5 text-zinc-600 dark:text-zinc-400 text-lg max-w-2xl">
            Book more, save more. Choose a bundle that fits your game.
          </p>
          <div className="mt-6 h-px w-24 bg-gradient-to-r from-[#2DD4BF] to-transparent rounded-full" />
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {PLANS.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={CARD_ENTRANCE.initial}
              whileInView={CARD_ENTRANCE.whileInView}
              viewport={CARD_ENTRANCE.viewport}
              transition={{
                ...CARD_ENTRANCE.transition,
                delay: index * 0.1,
              }}
              whileHover={{
                y: -4,
                scale: 1.02,
                transition: { duration: 0.35, ease: LUXURY_EASE },
              }}
              className={`group relative cursor-default rounded-2xl overflow-hidden border bg-white dark:bg-zinc-900/80 backdrop-blur-sm shadow-lg transition-all duration-300 hover:shadow-xl ${plan.borderGlow} ${
                plan.highlight
                  ? "border-[#2DD4BF]/50 shadow-[#2DD4BF]/10 ring-2 ring-[#2DD4BF]/20 dark:ring-[#2DD4BF]/30 shadow-lg"
                  : "border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
              }`}
            >
              {/* Tier accent bar */}
              <div
                className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${plan.accent}`}
              />
              {plan.highlight && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                  className="absolute top-4 right-4 px-3 py-1 rounded-full bg-[#2DD4BF] text-[#0F172A] text-xs font-semibold shadow-lg shadow-[#2DD4BF]/30"
                >
                  Popular
                </motion.span>
              )}
              <div className="p-6 pt-7">
                <motion.h3
                  className="text-xl font-bold text-black dark:text-white"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 + index * 0.1 }}
                >
                  {plan.name}
                </motion.h3>
                <motion.div
                  className="mt-5"
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                >
                  <span className="text-3xl font-bold bg-gradient-to-r from-[#14b8a6] to-[#2DD4BF] bg-clip-text text-transparent">
                    PKR {plan.price.toLocaleString()}
                  </span>
                  <span className="text-zinc-500 dark:text-zinc-400 text-sm ml-1">
                    /month
                  </span>
                </motion.div>
                <motion.p
                  className="mt-3 text-zinc-600 dark:text-zinc-400 text-sm"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.35 + index * 0.1 }}
                >
                  <span className="font-semibold text-black dark:text-white">
                    {plan.hours} hours
                  </span>{" "}
                  included
                </motion.p>
                <motion.p
                  className="mt-1 text-xs text-zinc-500 dark:text-zinc-500"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                >
                  ~PKR {(plan.price / plan.hours).toLocaleString()}/hr
                </motion.p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Terms */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4, ease: LUXURY_EASE }}
          className="mt-20 p-6 md:p-8 rounded-2xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm border border-zinc-200 dark:border-zinc-800 shadow-lg border-l-4 border-l-[#2DD4BF]"
        >
          <h4 className="text-sm font-semibold text-black dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-1 h-4 rounded-full bg-[#2DD4BF]" />
            Terms & conditions
          </h4>
          <ul className="space-y-3">
            {TERMS.map((term, i) => (
              <li
                key={i}
                className="flex items-start gap-3 text-zinc-600 dark:text-zinc-400 text-sm"
              >
                <Check className="w-4 h-4 text-[#2DD4BF] shrink-0 mt-0.5" />
                <span>{term}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      </div>
    </section>
  );
};
