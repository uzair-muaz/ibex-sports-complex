"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

/** Box cricket launch: 21 Nov 2026, 00:00 Pakistan time. The banner stays hidden before this. */
const SHOW_FROM = new Date("2026-11-21T00:00:00+05:00");
const CLOSED_KEY = "ibex-cricket-banner-closed";

/**
 * One-time announcement popup on the public site. Shown once per visit
 * (closing it hides it until the browser tab is opened again). Not shown on admin pages.
 */
export function CricketLaunchBanner() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const hidden = pathname?.startsWith("/admin");

  useEffect(() => {
    if (hidden || Date.now() < SHOW_FROM.getTime()) return;
    try {
      if (sessionStorage.getItem(CLOSED_KEY)) return;
    } catch {
      // Storage blocked: still show it.
    }
    const t = setTimeout(() => setOpen(true), 400);
    return () => clearTimeout(t);
  }, [hidden]);

  const close = () => {
    setOpen(false);
    try {
      sessionStorage.setItem(CLOSED_KEY, "1");
    } catch {
      // Ignore.
    }
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (hidden) return null;

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cricket-banner-title"
        >
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={close} />
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-zinc-950 shadow-[0_30px_100px_rgba(0,0,0,0.8)]"
          >
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black/80"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="relative aspect-[3/2] w-full">
              <Image
                src="/images/cricket.webp"
                alt="Box cricket court at IBEX Sports Complex"
                fill
                priority
                sizes="(max-width: 480px) 100vw, 448px"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent" />
            </div>

            <div className="space-y-4 p-6 pt-2 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2DD4BF]">Now open</p>
              <h2 id="cricket-banner-title" className="text-2xl font-bold text-white md:text-3xl">
                Box Cricket is here!
              </h2>
              <p className="text-zinc-400">
                Box cricket is now open at IBEX Sports Complex. Bring your team and book your slot today.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Link
                  href="/booking"
                  onClick={close}
                  className="flex h-11 flex-1 items-center justify-center rounded-xl bg-[#2DD4BF] text-sm font-semibold text-[#0F172A] transition hover:bg-[#14B8A6]"
                >
                  Book now
                </Link>
                <button
                  type="button"
                  onClick={close}
                  className="flex h-11 flex-1 items-center justify-center rounded-xl border border-white/15 text-sm text-zinc-300 transition hover:bg-white/5"
                >
                  Maybe later
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
