'use client';

import { motion } from 'framer-motion';

export const MarqueeSection = ({ text }: { text: string }) => {
  return (
    <div className="relative z-30 py-3 sm:py-4 min-h-[4rem] sm:min-h-[5rem] bg-[#2DD4BF] border-y-2 sm:border-y-4 border-black dark:border-white -skew-y-2 scale-105 shadow-xl overflow-hidden isolate">
      <motion.div 
        className="animate-marquee whitespace-nowrap flex gap-8 sm:gap-12 items-center font-black text-4xl sm:text-6xl md:text-8xl tracking-tighter uppercase text-black"
        animate={{ x: [0, -1000] }}
        transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
      >
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="flex items-center gap-8">
            <span className="italic">{text}</span>
            <span className="w-4 h-4 rounded-full bg-black"></span>
          </div>
        ))}
      </motion.div>
    </div>
  );
};

