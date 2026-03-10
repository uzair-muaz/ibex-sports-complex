"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Tag, X } from "lucide-react";
import { getActiveDiscounts } from "@/app/actions/discounts";
import {
  formatDiscountValue,
  formatCourtTypes,
  isDiscountCurrentlyActive,
} from "@/lib/discount-utils";
import type { Discount } from "@/types";

interface DiscountBannerProps {
  className?: string;
}

export function DiscountBanner({ className = "" }: DiscountBannerProps) {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadDiscounts = async () => {
      try {
        const result = await getActiveDiscounts();
        if (result.success && result.discounts.length > 0) {
          // Filter to only currently active discounts
          const activeOnes = result.discounts.filter((d: Discount) =>
            isDiscountCurrentlyActive({
              ...d,
              _id: d._id,
            }),
          );
          setDiscounts(activeOnes);
        }
      } catch (error) {
        console.error("Failed to load discounts:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDiscounts();
  }, []);

  // Rotate through discounts every 5 seconds
  useEffect(() => {
    if (discounts.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % discounts.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [discounts.length]);

  if (isLoading || discounts.length === 0) {
    return null;
  }

  const currentDiscount = discounts[currentIndex];

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.8 }}
          className={`bg-gradient-to-r from-[#2DD4BF]/20 via-[#2DD4BF]/10 to-[#2DD4BF]/20 border-y border-[#2DD4BF]/30 backdrop-blur-sm ${className}`}
        >
          <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 sm:py-3 relative">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-3 pr-8 sm:pr-0">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentIndex}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -20, opacity: 0 }}
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                  className="text-center"
                >
                  {/* Mobile: Compact single line */}
                  <div className="sm:hidden flex items-center justify-center gap-1.5 flex-wrap">
                    <motion.span
                      className="text-white font-bold text-xs"
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        repeatDelay: 1,
                      }}
                    >
                      {formatDiscountValue(
                        currentDiscount.type,
                        currentDiscount.value,
                      )}{" "}
                      OFF
                    </motion.span>
                    <span className="text-zinc-400 text-xs">on</span>
                    <span className="text-zinc-300 text-xs">
                      {formatCourtTypes(currentDiscount.courtTypes)}
                    </span>
                  </div>

                  {/* Desktop: Full details */}
                  <div className="hidden sm:flex items-center justify-center gap-2">
                    <motion.div
                      animate={{ rotate: [0, 15, -15, 0] }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        repeatDelay: 3,
                      }}
                    >
                      <Tag className="w-4 h-4 text-[#2DD4BF] shrink-0" />
                    </motion.div>
                    <span className="text-[#2DD4BF] font-semibold text-sm">
                      {currentDiscount.name}
                    </span>
                    <span className="text-white mx-1">•</span>
                    <motion.span
                      className="text-white font-bold text-sm"
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        repeatDelay: 1,
                      }}
                    >
                      {formatDiscountValue(
                        currentDiscount.type,
                        currentDiscount.value,
                      )}{" "}
                      OFF
                    </motion.span>
                    <span className="text-zinc-400 mx-1 text-sm">on</span>
                    <span className="text-zinc-300 text-sm">
                      {formatCourtTypes(currentDiscount.courtTypes)}
                    </span>
                    {!currentDiscount.allDay && (
                      <>
                        <span className="text-zinc-400 mx-1 text-sm">•</span>
                        <span className="text-zinc-400 text-xs">
                          {currentDiscount.startHour}:00 -{" "}
                          {currentDiscount.endHour}:00
                        </span>
                      </>
                    )}
                  </div>
                </motion.div>
              </AnimatePresence>

              {discounts.length > 1 && (
                <div className="flex items-center gap-1 sm:ml-2">
                  {discounts.map((_, idx) => (
                    <motion.div
                      key={idx}
                      className={`w-1.5 h-1.5 rounded-full ${
                        idx === currentIndex ? "bg-[#2DD4BF]" : "bg-zinc-600"
                      }`}
                      animate={
                        idx === currentIndex ? { scale: [1, 1.3, 1] } : {}
                      }
                      transition={{ duration: 0.3 }}
                    />
                  ))}
                </div>
              )}
            </div>

            <motion.button
              onClick={() => setIsVisible(false)}
              className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors p-1"
              aria-label="Dismiss banner"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <X className="w-4 h-4 sm:w-4 sm:h-4" />
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Compact version for inline use
export function DiscountBadge({ discount }: { discount: Discount }) {
  return (
    <div className="inline-flex items-center gap-1.5 bg-[#2DD4BF]/10 border border-[#2DD4BF]/30 rounded-full px-3 py-1">
      <Tag className="w-3 h-3 text-[#2DD4BF]" />
      <span className="text-[#2DD4BF] text-sm font-medium">
        {formatDiscountValue(discount.type, discount.value)} OFF
      </span>
    </div>
  );
}
