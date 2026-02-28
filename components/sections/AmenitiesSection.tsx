"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { Coffee, Zap } from "lucide-react";
import { ParallaxSection } from "@/components/ui/ParallaxSection";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

export const AmenitiesSection = () => {
  return (
    <section className="py-16 sm:py-20 md:py-28 lg:py-40 px-4 sm:px-6 bg-white dark:bg-[#050505] transition-colors duration-500 relative overflow-hidden">
      {/* Subtle background glow */}
      <div
        className="absolute top-1/3 left-1/4 w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] rounded-full bg-zinc-200/30 dark:bg-white/[0.02] blur-[100px]"
        aria-hidden
      />

      <div className="relative max-w-7xl mx-auto">
        {/* Header */}
        <ScrollReveal range={[0.05, 0.3]}>
          <div className="mb-14 sm:mb-20 md:mb-28">
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-[#2DD4BF] font-mono text-xs uppercase tracking-[0.25em] mb-4 sm:mb-6"
            >
              The Social Hub
            </motion.p>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="text-3xl sm:text-4xl md:text-6xl font-bold tracking-tight gradient-text"
            >
              Hive Cafe
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-4 sm:mt-6 text-base sm:text-lg md:text-xl text-zinc-600 dark:text-zinc-400 max-w-2xl leading-relaxed"
            >
              More than just a coffee shop. Hive is where the community gathers
              post-match. We serve specialist grade coffee, roasted to
              perfection, and a curated menu of healthy snacks and refreshing
              drinks.
            </motion.p>
          </div>
        </ScrollReveal>

        {/* Content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 sm:gap-12 md:gap-20 items-start">
          {/* Left — features */}
          <div className="space-y-8 sm:space-y-12">
            <ParallaxSection speed={0.1}>
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7 }}
                className="flex gap-5"
              >
                <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-[#2DD4BF]/10 flex items-center justify-center">
                  <Coffee className="w-6 h-6 text-[#2DD4BF]" />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-black dark:text-white mb-2">
                    Specialist Grade
                  </h4>
                  <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    Ethically sourced beans, expertly brewed by our master
                    baristas.
                  </p>
                </div>
              </motion.div>
            </ParallaxSection>

            <ParallaxSection speed={0.15}>
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.7, delay: 0.15 }}
                className="flex gap-5"
              >
                <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-[#2DD4BF]/10 flex items-center justify-center">
                  <Zap className="w-6 h-6 text-[#2DD4BF]" />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-black dark:text-white mb-2">
                    Post-Match Recovery
                  </h4>
                  <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    Fresh juices and protein shakes to refuel your body after a
                    session.
                  </p>
                </div>
              </motion.div>
            </ParallaxSection>
          </div>

          {/* Right — cafe image */}
          <ParallaxSection speed={0.2}>
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="relative group"
            >
              <div className="relative aspect-[4/3] overflow-hidden rounded-3xl shadow-2xl ring-1 ring-white/5">
                <Image
                  src="/images/coffee.jpg"
                  alt="Hive Cafe Coffee"
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover transition-transform duration-1000 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                <div className="absolute bottom-5 left-5">
                  <span className="text-white/70 text-sm font-mono tracking-widest uppercase">
                    Hive Cafe
                  </span>
                </div>
              </div>
            </motion.div>
          </ParallaxSection>
        </div>
      </div>
    </section>
  );
};
