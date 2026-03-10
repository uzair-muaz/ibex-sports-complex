"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import type { ReactNode } from "react";

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  /** Scroll progress range [start, end] (0-1) over which opacity goes 0→1 and y 40→0 */
  range?: [number, number];
  /** Stagger: offset the range for this child (e.g. 0.05 per index) */
  stagger?: number;
}

export function ScrollReveal({
  children,
  className = "",
  range = [0.1, 0.4],
  stagger = 0,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const [start, end] = range;
  const staggerStart = Math.max(0, start + stagger);
  const staggerEnd = Math.min(1, end + stagger);

  const opacity = useTransform(
    scrollYProgress,
    [0, staggerStart, staggerEnd, 1],
    [0, 0, 1, 1]
  );
  const y = useTransform(
    scrollYProgress,
    [0, staggerStart, staggerEnd, 1],
    [40, 40, 0, 0]
  );

  return (
    <motion.div ref={ref} style={{ opacity, y }} className={className}>
      {children}
    </motion.div>
  );
}
