"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import useSWR from "swr";
import { ParallaxSection } from "@/components/ui/ParallaxSection";
import { TextReveal } from "@/components/ui/TextReveal";
import { PricingBadge } from "@/components/ui/PricingBadge";

// Static data - all court information is hardcoded
// Only prices come from DB via ISR + SWR hybrid rendering
interface PriceData {
  pricePerHour: number;
  type: string;
}

interface FacilitiesSectionProps {
  // Initial prices from ISR (server-side)
  padelCourts: PriceData[];
  cricketCourts: PriceData[];
  pickleballCourts: PriceData[];
  futsalCourts: PriceData[];
}

// SWR fetcher for client-side price updates
const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
};

// Static images - hardcoded, not from DB
const premiumImages = {
  padel: "/images/paddle.jpg",
  cricket: "/images/cricket.webp",
  pickleball: "/images/pickleball.jpg",
  futsal: "/images/futsal.jpg",
};

// Static court data - hardcoded
const staticCourtData = {
  padel: {
    name: "Padel Court",
    description: "Professional panoramic glass court with Mondo turf.",
  },
  cricket: {
    name: "Cricket Nets",
    description:
      "Full-length automated bowling lane with spin and speed control.",
  },
  pickleball: {
    name: "Pickleball Court",
    description:
      "Premium indoor pickleball court with professional-grade surface.",
  },
  futsal: {
    name: "Futsal Court",
    description:
      "Professional indoor futsal court with FIFA-approved synthetic surface.",
  },
};

export const FacilitiesSection = ({
  padelCourts: initialPadelCourts,
  cricketCourts: initialCricketCourts,
  pickleballCourts: initialPickleballCourts,
  futsalCourts: initialFutsalCourts,
}: FacilitiesSectionProps) => {
  // SWR for real-time price updates (stale-while-revalidate)
  // Falls back to initial ISR data if fetch fails
  const { data: courtsData } = useSWR<PriceData[]>("/api/courts", fetcher, {
    fallbackData: [
      ...initialPadelCourts,
      ...initialCricketCourts,
      ...initialPickleballCourts,
    ],
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    refreshInterval: 900000, // Revalidate every 15 minutes (900000ms)
  });

  // Use SWR data if available, otherwise fall back to initial ISR data
  const allCourts = courtsData || [
    ...initialPadelCourts,
    ...initialCricketCourts,
    ...initialPickleballCourts,
    ...initialFutsalCourts,
  ];

  const padelCourts = allCourts.filter((c) => c.type === "PADEL");
  const cricketCourts = allCourts.filter((c) => c.type === "CRICKET");
  const pickleballCourts = allCourts.filter((c) => c.type === "PICKLEBALL");
  const futsalCourts = allCourts.filter((c) => c.type === "FUTSAL");
  return (
    <section className="py-32 px-6 bg-zinc-50 dark:bg-zinc-950 transition-colors duration-200 relative z-20">
      <div className="max-w-7xl mx-auto space-y-24">
        <ParallaxSection speed={0.3}>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-12">
            <div className="space-y-4">
              <TextReveal className="text-7xl md:text-8xl font-bold tracking-tighter gradient-text">
                THE FACILITIES
              </TextReveal>
              <div className="h-2 w-32 bg-[#2DD4BF] rounded-full" />
            </div>
            <p className="text-zinc-600 dark:text-zinc-400 max-w-sm text-xl font-light leading-relaxed">
              Immerse yourself in our world-class courts designed for optimal
              performance.
            </p>
          </div>
        </ParallaxSection>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {padelCourts.length > 0 && (
            <ParallaxSection speed={0.2}>
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-10%" }}
                transition={{ duration: 0.8 }}
                className="relative group overflow-hidden rounded-[2.5rem] h-[600px] shadow-2xl cursor-pointer"
              >
                <Image
                  src={premiumImages.padel}
                  alt={staticCourtData.padel.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover transition-transform duration-1000 group-hover:scale-110"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-12 flex flex-col justify-end">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[#2DD4BF] font-mono text-sm tracking-widest uppercase font-bold">
                      01 — Padel
                    </span>
                    <PricingBadge
                      price={padelCourts[0]?.pricePerHour || 5000}
                    />
                  </div>
                  <h3 className="text-4xl md:text-5xl font-bold text-white mb-4">
                    {staticCourtData.padel.name}
                  </h3>
                  <p className="text-zinc-300 max-w-md transform translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
                    {staticCourtData.padel.description}
                  </p>
                </div>
              </motion.div>
            </ParallaxSection>
          )}

          {futsalCourts.length > 0 && (
            <ParallaxSection speed={0.2}>
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-10%" }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="relative group overflow-hidden rounded-[2.5rem] h-[600px] mt-0 md:mt-24 shadow-2xl cursor-pointer"
              >
                <Image
                  src={premiumImages.futsal}
                  alt={staticCourtData.futsal.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover transition-transform duration-1000 group-hover:scale-110"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-12 flex flex-col justify-end">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[#2DD4BF] font-mono text-sm tracking-widest uppercase font-bold">
                      02 — Futsal
                    </span>
                    <PricingBadge
                      price={futsalCourts[0]?.pricePerHour || 6000}
                    />
                  </div>
                  <h3 className="text-4xl md:text-5xl font-bold text-white mb-4">
                    {staticCourtData.futsal.name}
                  </h3>
                  <p className="text-zinc-300 max-w-md transform translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
                    {staticCourtData.futsal.description}
                  </p>
                </div>
              </motion.div>
            </ParallaxSection>
          )}

          {pickleballCourts.length > 0 && (
            <ParallaxSection speed={0.2}>
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-10%" }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="relative group overflow-hidden rounded-[2.5rem] h-[600px] shadow-2xl cursor-pointer"
              >
                <Image
                  src={premiumImages.pickleball}
                  alt={staticCourtData.pickleball.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover transition-transform duration-1000 group-hover:scale-110"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-12 flex flex-col justify-end">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[#2DD4BF] font-mono text-sm tracking-widest uppercase font-bold">
                      03 — Pickleball
                    </span>
                    <PricingBadge
                      price={pickleballCourts[0]?.pricePerHour || 4000}
                    />
                  </div>
                  <h3 className="text-4xl md:text-5xl font-bold text-white mb-4">
                    {staticCourtData.pickleball.name}
                  </h3>
                  <p className="text-zinc-300 max-w-md transform translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
                    {staticCourtData.pickleball.description}
                  </p>
                </div>
              </motion.div>
            </ParallaxSection>
          )}

          {cricketCourts.length > 0 && (
            <ParallaxSection speed={0.2}>
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-10%" }}
                transition={{ duration: 0.8, delay: 0.6 }}
                className="relative group overflow-hidden rounded-[2.5rem] h-[600px] mt-0 md:mt-24 shadow-2xl cursor-pointer"
              >
                <Image
                  src={premiumImages.cricket}
                  alt={staticCourtData.cricket.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover transition-transform duration-1000 group-hover:scale-110"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-12 flex flex-col justify-end">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[#2DD4BF] font-mono text-sm tracking-widest uppercase font-bold">
                      04 — Cricket
                    </span>
                    <PricingBadge
                      price={cricketCourts[0]?.pricePerHour || 8000}
                    />
                  </div>
                  <h3 className="text-4xl md:text-5xl font-bold text-white mb-4">
                    {staticCourtData.cricket.name}
                  </h3>
                  <p className="text-zinc-300 max-w-md transform translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
                    {staticCourtData.cricket.description}
                  </p>
                </div>
              </motion.div>
            </ParallaxSection>
          )}
        </div>
      </div>
    </section>
  );
};
