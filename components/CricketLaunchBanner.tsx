"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

/** Bookings open 22 Nov 2026, 00:00 Pakistan time. Before this the popup says "coming soon". */
const BOOKINGS_OPEN = new Date("2026-11-22T00:00:00+05:00");

/**
 * Box cricket announcement popup on the public site. Shown once per visit
 * (closing it hides it until the site is opened again). Not shown on admin pages.
 * Until 22 Nov it says "coming soon, book now for 22 Nov or later"; from 22 Nov it says "now open".
 */
export function CricketLaunchBanner() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [isOpenForBooking, setIsOpenForBooking] = useState(false);
  const hidden = pathname?.startsWith("/admin");
  const closedKey = `ibex-cricket-banner-closed-${isOpenForBooking ? "open" : "soon"}`;

  useEffect(() => {
    if (hidden) return;
    const live = Date.now() >= BOOKINGS_OPEN.getTime();
    try {
      if (
        sessionStorage.getItem(
          `ibex-cricket-banner-closed-${live ? "open" : "soon"}`,
        )
      )
        return;
    } catch {
      // Storage blocked: still show it.
    }
    const t = setTimeout(() => {
      setIsOpenForBooking(live);
      setOpen(true);
    }, 400);
    return () => clearTimeout(t);
  }, [hidden]);

  const close = () => {
    setOpen(false);
    try {
      sessionStorage.setItem(closedKey, "1");
    } catch {
      // Ignore.
    }
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

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
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={close}
          />
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
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2DD4BF]">
                {isOpenForBooking ? "Now open" : "Coming soon"}
              </p>
              <h2
                id="cricket-banner-title"
                className="text-2xl font-bold text-white md:text-3xl"
              >
                {isOpenForBooking
                  ? "Box Cricket is here!"
                  : "Box Cricket is coming to IBEX!"}
              </h2>
              <p className="text-zinc-400">
                {isOpenForBooking
                  ? "Box cricket is now open at IBEX Sports Complex. Bring your team and book your slot today."
                  : "Box cricket opens on 22 November. Bookings are open now: reserve your slot for 22 November or any later date."}
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
