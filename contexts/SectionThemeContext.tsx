"use client";

import React, {
  createContext,
  useContext,
  useRef,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import type { SectionId, SectionTheme } from "@/lib/landing-story";
import { SECTION_THEME_MAP } from "@/lib/landing-story";

interface SectionThemeContextValue {
  activeSectionId: SectionId | null;
  sectionTheme: SectionTheme;
  registerSection: (id: SectionId, el: HTMLElement | null) => void;
}

const SectionThemeContext = createContext<SectionThemeContextValue | null>(null);

export function useSectionTheme() {
  const ctx = useContext(SectionThemeContext);
  return ctx;
}

const ratios = new Map<SectionId, number>();

function createObserver(
  setActive: (id: SectionId | null) => void
): IntersectionObserver {
  return new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        const id = (e.target as HTMLElement).getAttribute("data-section-id") as SectionId | null;
        if (id) ratios.set(id, e.intersectionRatio);
      });
      let bestId: SectionId | null = null;
      let bestRatio = 0;
      ratios.forEach((ratio, id) => {
        if (ratio > bestRatio) {
          bestRatio = ratio;
          bestId = id;
        }
      });
      if (bestId != null) setActive(bestId);
    },
    {
      root: null,
      rootMargin: "-15% 0px -50% 0px",
      threshold: [0, 0.1, 0.25, 0.5, 0.75, 1],
    }
  );
}

interface SectionThemeProviderProps {
  children: ReactNode;
}

export function SectionThemeProvider({ children }: SectionThemeProviderProps) {
  const [activeSectionId, setActiveSectionId] = useState<SectionId | null>("hero");
  const observerRef = useRef<IntersectionObserver | null>(null);

  const registerSection = useCallback((id: SectionId, el: HTMLElement | null) => {
    if (!observerRef.current)
      observerRef.current = createObserver(setActiveSectionId);
    const obs = observerRef.current;
    const current = document.querySelector(`[data-section-id="${id}"]`);
    if (current) obs.unobserve(current);
    if (el) {
      obs.observe(el);
    }
    if (!el) ratios.delete(id);
  }, []);

  useEffect(() => {
    const obs = observerRef.current;
    return () => {
      obs?.disconnect();
      observerRef.current = null;
    };
  }, []);

  const sectionTheme: SectionTheme =
    activeSectionId != null ? SECTION_THEME_MAP[activeSectionId] : "dark";

  return (
    <SectionThemeContext.Provider
      value={{ activeSectionId, sectionTheme, registerSection }}
    >
      {children}
    </SectionThemeContext.Provider>
  );
}
