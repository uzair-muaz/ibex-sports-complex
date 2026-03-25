/**
 * Storytelling landing page — chapter definitions.
 * Single source of truth for section order, copy, and theme.
 */

export type SectionId =
  | "hero"
  | "facilities"
  | "amenities"
  | "lifestyle"
  | "membership"
  | "contact";

export type SectionTheme = "dark";

export interface Chapter {
  id: SectionId;
  headline: string;
  subline?: string;
  theme: SectionTheme;
  bgClass?: string;
}

export const LANDING_CHAPTERS: Chapter[] = [
  {
    id: "hero",
    headline: "The Ibex Spirit",
    subline:
      "Where peak performance meets premium leisure. Experience the finest paddle, pickleball, and futsal in the heart of the capital.",
    theme: "dark",
  },
  {
    id: "facilities",
    headline: "Choose Your Arena",
    subline:
      "Whether you're a seasoned pro or picking up a racket for the first time, our world-class facilities are designed to elevate your game.",
    theme: "dark",
    bgClass: "bg-[#050505]",
  },
  {
    id: "amenities",
    headline: "Hive Cafe",
    subline:
      "More than just a coffee shop. Hive is where the community gathers post-match.",
    theme: "dark",
    bgClass: "bg-[#080808]",
  },
  {
    id: "lifestyle",
    headline: "Lifestyle",
    subline: "Life at IBEX — beyond the court.",
    theme: "dark",
    bgClass: "bg-black",
  },
  {
    id: "membership",
    headline: "Join the Ibex Community",
    subline:
      "Choose the way you play. From flexible hourly bookings to comprehensive monthly memberships.",
    theme: "dark",
    bgClass: "bg-[#050505]",
  },
  {
    id: "contact",
    headline: "Get in touch",
    subline: "Find us. Book your court.",
    theme: "dark",
    bgClass: "bg-[#050505]",
  },
];

export const SECTION_THEME_MAP: Record<SectionId, SectionTheme> =
  LANDING_CHAPTERS.reduce(
    (acc, ch) => {
      acc[ch.id] = ch.theme;
      return acc;
    },
    {} as Record<SectionId, SectionTheme>
  );

export function getChapter(id: SectionId): Chapter | undefined {
  return LANDING_CHAPTERS.find((c) => c.id === id);
}
