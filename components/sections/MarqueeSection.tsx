'use client';

import { motion } from 'framer-motion';

export const MarqueeSection = ({ text }: { text: string }) => {
  return (
    <div className="relative py-4 bg-[#2DD4BF] border-y-4 border-black dark:border-white transform -skew-y-2 scale-105 z-20 shadow-xl overflow-hidden">
      {/* Fade masks for softer edges */}
      <div className="absolute left-0 top-0 bottom-0 w-24 md:w-32 bg-gradient-to-r from-[#2DD4BF] to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-24 md:w-32 bg-gradient-to-l from-[#2DD4BF] to-transparent z-10 pointer-events-none" />
      <motion.div
        className="whitespace-nowrap flex gap-12 items-center font-black text-6xl md:text-8xl tracking-tighter uppercase text-black"
        animate={{ x: [0, -1000] }}
        transition={{ repeat: Infinity, duration: 28, ease: "linear" }}
      >
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="flex items-center gap-8">
            <span className="italic">{text}</span>
            <span className="w-4 h-4 rounded-full bg-black" />
          </div>
        ))}
      </motion.div>
    </div>
  );
};

