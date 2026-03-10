"use client";

import { useRef, useEffect, type ReactNode } from "react";
import { useSectionTheme } from "@/contexts/SectionThemeContext";
import { getChapter } from "@/lib/landing-story";
import type { SectionId } from "@/lib/landing-story";

interface SectionWrapperProps {
  id: SectionId;
  children: ReactNode;
  className?: string;
  /** Apply chapter bgClass when section has one (for lifestyle/contact) */
  useChapterBg?: boolean;
}

export function SectionWrapper({
  id,
  children,
  className = "",
  useChapterBg = false,
}: SectionWrapperProps) {
  const ref = useRef<HTMLElement>(null);
  const ctx = useSectionTheme();
  const registerSection = ctx?.registerSection;
  const chapter = getChapter(id);

  useEffect(() => {
    if (!registerSection) return;
    registerSection(id, ref.current);
    return () => registerSection(id, null);
  }, [id, registerSection]);

  const bgClass = useChapterBg && chapter?.bgClass ? chapter.bgClass : "";

  return (
    <section
      ref={ref}
      data-section-id={id}
      className={`transition-colors duration-500 md:snap-start ${bgClass} ${className}`.trim()}
    >
      {children}
    </section>
  );
}
