"use client";

import { motion, useScroll, useTransform } from "framer-motion";

export function LifestyleParallaxBg() {
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0.3, 0.7], [-30, 30]);

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
      style={{ y }}
    >
      <div className="absolute top-0 left-1/4 w-[60vw] h-[60vw] max-h-[800px] rounded-full bg-[#2DD4BF]/8 blur-[100px]" />
      <div className="absolute bottom-0 right-1/4 w-[40vw] h-[40vw] max-h-[500px] rounded-full bg-[#2DD4BF]/5 blur-[80px]" />
    </motion.div>
  );
}
