/**
 * Shared motion config for luxury landing feel.
 * Use for Framer Motion transition.ease and section entrances.
 */
export const LUXURY_EASE = [0.22, 1, 0.36, 1] as const;

export const SECTION_ENTRANCE = {
  initial: { opacity: 0, y: 32 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-10%" },
  transition: { duration: 0.85, ease: LUXURY_EASE },
} as const;

export const CARD_ENTRANCE = {
  initial: { opacity: 0, y: 40 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-50px" },
  transition: { duration: 0.7, ease: LUXURY_EASE },
} as const;
