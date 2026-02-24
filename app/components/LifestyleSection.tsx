"use client";

import { ParallaxSection } from "@/components/ui/ParallaxSection";
import { TextReveal } from "@/components/ui/TextReveal";
import { InfiniteGallery } from "@/components/ui/InfiniteScroll";
import { GALLERY_IMAGES } from "@/types";

export function LifestyleSection() {
  return (
    <ParallaxSection speed={0.1}>
      <section className="py-24 bg-white dark:bg-black overflow-hidden transition-colors duration-200">
        <div className="px-6 mb-12 max-w-7xl mx-auto">
          <TextReveal className="text-5xl md:text-6xl font-bold tracking-tighter gradient-text">
            LIFESTYLE
          </TextReveal>
        </div>
        <InfiniteGallery images={GALLERY_IMAGES} />
      </section>
    </ParallaxSection>
  );
}
