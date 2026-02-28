"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroScene } from "@/components/3d/HeroScene";

export const HeroSection = () => {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const bgY = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const contentY = useTransform(scrollYProgress, [0, 1], [0, 60]);
  const opacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  return (
    <section
      ref={ref}
      className="relative min-h-screen w-full flex items-center justify-center overflow-hidden"
    >
      <motion.div className="absolute inset-0 z-0" style={{ y: bgY }}>
        <HeroScene />
      </motion.div>

      <motion.div
        className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-6 flex flex-col items-center text-center"
        style={{ y: contentY, opacity }}
      >
        {/* Location badge */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="flex items-center gap-2 px-3 py-2 sm:px-4 rounded-full border border-zinc-300/50 dark:border-white/10 bg-white/60 dark:bg-white/5 backdrop-blur-md mb-6 sm:mb-10"
        >
          <MapPin className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400 shrink-0" />
          <span className="text-xs font-medium uppercase tracking-widest text-zinc-600 dark:text-zinc-400">
            Islamabad, Pakistan
          </span>
        </motion.div>

        {/* Title — mobile-first scale */}
        <div className="mb-6 sm:mb-8">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.25 }}
            className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-black tracking-tighter leading-[0.9]"
          >
            <span className="gradient-text pr-[0.05em]">IBEX</span>
            <br />
            <span className="gradient-text pr-[0.05em]">SPORTS</span>
            <br />
            <span className="gradient-text pr-[0.05em]"> COMPLEX</span>
          </motion.h1>
        </div>

        {/* Subline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.55 }}
          className="max-w-2xl text-base sm:text-lg md:text-xl text-zinc-500 dark:text-zinc-400 font-light leading-relaxed mb-10 sm:mb-12"
        >
          Where peak performance meets premium leisure. Experience the finest
          paddle, pickleball, and futsal in the heart of the capital.
        </motion.p>

        {/* CTA — full-width on mobile for easier tap */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.7 }}
          className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 sm:gap-5 w-full sm:w-auto max-w-sm sm:max-w-none mx-auto"
        >
          <Link href="/booking" className="w-full sm:w-auto">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full sm:w-auto">
              <Button
                size="lg"
                className="group relative w-full sm:w-auto min-h-12 h-12 sm:h-14 px-6 sm:px-10 text-base sm:text-lg rounded-full bg-[#2DD4BF] text-[#0F172A] font-bold border-0 overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-200 cursor-pointer"
              >
                <span className="relative z-10 flex items-center gap-2">
                  Book Court
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                </span>
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-[#14B8A6] to-[#2DD4BF] opacity-0 group-hover:opacity-100"
                  transition={{ duration: 0.2 }}
                />
              </Button>
            </motion.div>
          </Link>
          <div className="flex flex-col text-xs font-mono text-zinc-400 dark:text-zinc-500 uppercase tracking-widest text-center sm:text-left sm:border-l sm:border-zinc-300/40 dark:sm:border-zinc-700 sm:pl-5">
            <span>Open Daily</span>
            <span className="text-black dark:text-white font-bold">
              12 PM — 4 AM
            </span>
          </div>
        </motion.div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2"
      >
        <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500">
          Scroll
        </span>
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
          className="w-px h-8 bg-gradient-to-b from-zinc-400 dark:from-zinc-500 to-transparent"
        />
      </motion.div>
    </section>
  );
};
