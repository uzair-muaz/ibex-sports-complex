"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { ParallaxSection } from "@/components/ui/ParallaxSection";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

const SPORTS = [
  {
    key: "paddle",
    tag: "Trending",
    tagColor: "bg-white/90 text-black dark:bg-white/20 dark:text-white",
    name: "Paddle Tennis",
    description:
      "Fast-paced, social, and addictive. Our panoramic courts offer the best playing experience in Islamabad.",
    image: "/images/paddle.jpg",
  },
  {
    key: "pickleball",
    tag: "New",
    tagColor: "bg-white/90 text-black dark:bg-white/20 dark:text-white",
    name: "Pickleball",
    description:
      "The fastest growing sport in the world has found its home at Ibex. Perfect for all ages and skill levels.",
    image: "/images/pickleball.jpg",
  },
  {
    key: "futsal",
    tag: "Classic",
    tagColor: "bg-zinc-800 text-white dark:bg-zinc-700",
    name: "Futsal",
    description:
      "High-intensity action on professional-grade turf. Bring your team and dominate the pitch.",
    image: "/images/futsal.jpg",
  },
] as const;

export const FacilitiesSection = () => {
  return (
    <section className="py-12 sm:py-16 md:py-24 lg:py-36 px-4 sm:px-6 bg-zinc-50 dark:bg-[#0a0a0a] transition-colors duration-500 relative z-20">
      <div className="max-w-7xl mx-auto">
        {/* Section intro */}
        <ScrollReveal range={[0.05, 0.3]}>
          <div className="mb-10 sm:mb-14 md:mb-20 lg:mb-28">
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-[#2DD4BF] font-mono text-xs uppercase tracking-[0.25em] mb-3 sm:mb-5"
            >
              Choose Your Arena
            </motion.p>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="text-3xl sm:text-4xl md:text-6xl font-bold tracking-tight gradient-text"
            >
              Our Facilities
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-4 sm:mt-6 text-base sm:text-lg md:text-xl text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-2xl"
            >
              Whether you&apos;re a seasoned pro or picking up a racket for the
              first time, our world-class facilities are designed to elevate
              your game.
            </motion.p>
          </div>
        </ScrollReveal>

        {/* Sport cards */}
        <div className="space-y-12 sm:space-y-16 md:space-y-24 lg:space-y-32">
          {SPORTS.map((sport, index) => (
            <ParallaxSection key={sport.key} speed={0.15 + index * 0.05}>
              <motion.div
                initial={{ opacity: 0, y: 60 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-15%" }}
                transition={{
                  duration: 0.9,
                  delay: index * 0.1,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className={`grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-10 md:gap-16 items-center ${
                  index % 2 !== 0 ? "lg:direction-rtl" : ""
                }`}
              >
                {/* Image */}
                <div
                  className={`relative group overflow-hidden rounded-3xl aspect-[4/3] shadow-2xl ${
                    index % 2 !== 0 ? "lg:order-2" : ""
                  }`}
                >
                  <Image
                    src={sport.image}
                    alt={sport.name}
                    fill
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    className="object-cover transition-transform duration-1000 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <div className="absolute top-5 left-5 flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${sport.tagColor}`}>
                      {sport.tag}
                    </span>
                  </div>
                </div>

                {/* Copy */}
                <div className={index % 2 !== 0 ? "lg:order-1" : ""}>
                  <motion.h3
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight gradient-text mb-4 sm:mb-6"
                  >
                    {sport.name}
                  </motion.h3>
                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.35 }}
                    className="text-base sm:text-lg md:text-xl text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-lg"
                  >
                    {sport.description}
                  </motion.p>
                </div>
              </motion.div>
            </ParallaxSection>
          ))}
        </div>
      </div>
    </section>
  );
};
