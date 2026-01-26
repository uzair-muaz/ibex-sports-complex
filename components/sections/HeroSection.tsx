"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroScene } from "@/components/3d/HeroScene";
import { TextReveal } from "@/components/ui/TextReveal";

export const HeroSection = () => {
  return (
    <section className="relative h-[80vh] sm:h-screen w-full flex items-center justify-center px-4 sm:px-6 pt-16 sm:pt-20 overflow-hidden">
      <HeroScene />

      <div className="relative z-10 w-full max-w-7xl mx-auto flex flex-col items-start justify-center h-full">
        <div className="space-y-1 sm:space-y-2 mb-6 sm:mb-8 md:mb-10">
          <div className="overflow-hidden">
            <TextReveal
              className="text-7xl sm:text-7xl md:text-[10rem] lg:text-[11rem] xl:text-[12rem] font-black tracking-tighter leading-[0.85] text-black dark:text-white"
              delay={0.1}
            >
              IBEX
            </TextReveal>
          </div>
          <div className="overflow-hidden">
            <TextReveal
              className="text-7xl sm:text-8xl md:text-[10rem] lg:text-[11rem] xl:text-[12rem] font-black tracking-tighter leading-[0.85] gradient-text"
              delay={0.3}
            >
              SPORTS
            </TextReveal>
          </div>
          <div className="overflow-hidden">
            <TextReveal
              className="text-7xl sm:text-8xl md:text-[10rem] lg:text-[11rem] xl:text-[12rem] font-black tracking-tighter leading-[0.85] gradient-text"
              delay={0.4}
            >
              COMPLEX
            </TextReveal>
          </div>
        </div>

        <div className="max-w-xl mb-6 sm:mb-8 md:mb-12">
          <TextReveal
            className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-zinc-600 dark:text-zinc-300 font-light leading-relaxed"
            delay={0.6}
          >
            Precision meets passion. The ultimate destination for Padel,
            Cricket, Pickleball & Futsal.
          </TextReveal>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.8 }}
          className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-8 w-full sm:w-auto"
        >
          <Link href="/booking" className="w-full sm:w-auto">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-full sm:w-auto"
            >
              <Button
                size="lg"
                className="group relative w-full sm:w-auto h-14 sm:h-16 px-8 sm:px-12 text-lg sm:text-xl rounded-full bg-[#2DD4BF] text-[#0F172A] font-bold border-0 overflow-hidden shadow-2xl shadow-[#2DD4BF]/30 hover:shadow-[#2DD4BF]/50 transition-all duration-200 cursor-pointer"
              >
                <span className="relative z-10 flex items-center justify-center">
                  Book Court
                  <motion.div
                    animate={{ x: [0, 5, 0] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                  >
                    <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6 ml-2" />
                  </motion.div>
                </span>
                {/* Hover gradient overlay */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-[#14B8A6] to-[#2DD4BF] opacity-0 group-hover:opacity-100"
                  transition={{ duration: 0.2 }}
                />
                {/* Shine effect */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                  animate={{ x: ["-200%", "200%"] }}
                  transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
                />
                {/* Glow on hover */}
                <motion.div
                  className="absolute -inset-1 bg-[#2DD4BF] rounded-full blur-xl opacity-0 group-hover:opacity-40"
                  transition={{ duration: 0.2 }}
                />
              </Button>
            </motion.div>
          </Link>
          <div className="hidden md:flex flex-col text-xs font-mono text-zinc-400 dark:text-zinc-500 uppercase tracking-widest border-l border-zinc-400/30 dark:border-zinc-700 pl-6">
            <span>Open Daily</span>
            <span className="text-white dark:text-white font-bold">
              12 PM - 2 AM
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
