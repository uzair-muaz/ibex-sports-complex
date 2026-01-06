'use client';

import { motion } from 'framer-motion';

export const MarqueeSection = ({ text }: { text: string }) => {
  return (
    <div className="relative py-4 bg-[#ccff00] border-y-4 border-black dark:border-white transform -skew-y-2 scale-105 z-20 shadow-xl overflow-hidden">
      <motion.div 
        className="animate-marquee whitespace-nowrap flex gap-12 items-center font-black text-6xl md:text-8xl tracking-tighter uppercase text-black"
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

