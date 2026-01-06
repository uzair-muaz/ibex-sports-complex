'use client';

import { motion } from 'framer-motion';

export const PricingBadge = ({ price, className = '' }: { price: number; className?: string }) => {
  if (price === 0) {
    return (
      <motion.div
        initial={{ scale: 0 }}
        whileInView={{ scale: 1 }}
        viewport={{ once: true }}
        whileHover={{ scale: 1.1 }}
        className={`inline-flex items-center gap-2 px-4 py-2 bg-[#ccff00] text-black rounded-full font-bold text-sm ${className}`}
      >
        <span>FREE</span>
      </motion.div>
    );
  }
  
  return (
    <motion.div
      initial={{ scale: 0 }}
      whileInView={{ scale: 1 }}
      viewport={{ once: true }}
      whileHover={{ scale: 1.1 }}
      className={`inline-flex items-center gap-2 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-full font-bold text-sm ${className}`}
    >
      <span>PKR {price.toLocaleString()}</span>
      <span className="text-xs opacity-70">/hour</span>
    </motion.div>
  );
};

