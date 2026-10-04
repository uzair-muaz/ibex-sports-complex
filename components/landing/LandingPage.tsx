"use client";

import dynamic from "next/dynamic";
import { HeroSection } from "@/components/sections/HeroSection";
import { MarqueeSection } from "@/components/sections/MarqueeSection";
import { SectionThemeProvider } from "@/contexts/SectionThemeContext";
import { SectionWrapper } from "@/components/landing/SectionWrapper";
import { GALLERY_IMAGES } from "@/types";

const FacilitiesSection = dynamic(
  () =>
    import("@/components/sections/FacilitiesSection").then(
      (m) => m.FacilitiesSection,
    ),
  { ssr: true },
);
const AmenitiesSection = dynamic(
  () =>
    import("@/components/sections/AmenitiesSection").then(
      (m) => m.AmenitiesSection,
    ),
  { ssr: true },
);
const MembershipSection = dynamic(
  () =>
    import("@/components/sections/MembershipSection").then(
      (m) => m.MembershipSection,
    ),
  { ssr: true },
);
const GetInTouchSection = dynamic(
  () =>
    import("@/components/sections/GetInTouchSection").then(
      (m) => m.GetInTouchSection,
    ),
  { ssr: true },
);
const InfiniteGallery = dynamic(
  () =>
    import("@/components/ui/InfiniteScroll").then((m) => m.InfiniteGallery),
  { ssr: true },
);
const ParallaxSection = dynamic(
  () =>
    import("@/components/ui/ParallaxSection").then((m) => m.ParallaxSection),
  { ssr: true },
);
const LifestyleParallaxBg = dynamic(
  () =>
    import("@/components/landing/LifestyleParallaxBg").then(
      (m) => m.LifestyleParallaxBg,
    ),
  { ssr: true },
);

export function LandingPage() {
  return (
    <SectionThemeProvider>
      <>
        <main id="main-content" className="relative" tabIndex={-1}>
          <SectionWrapper id="hero">
            <HeroSection />
          </SectionWrapper>

          <MarqueeSection text="Paddle · Pickleball · Futsal" />

          <SectionWrapper id="facilities">
            <FacilitiesSection />
          </SectionWrapper>

          <SectionWrapper id="amenities">
            <AmenitiesSection />
          </SectionWrapper>

          <SectionWrapper id="lifestyle" useChapterBg className="relative">
            <LifestyleParallaxBg />
            <ParallaxSection speed={0.1}>
              <section className="relative z-10 py-12 sm:py-20 md:py-28 lg:py-36 overflow-hidden">
                <div className="px-4 sm:px-6 mb-10 sm:mb-14 md:mb-20 lg:mb-28 max-w-7xl mx-auto">
                  <p className="text-[#2DD4BF] font-mono text-xs uppercase tracking-[0.25em] mb-3 sm:mb-5">
                    Life at IBEX
                  </p>
                  <h2 className="text-3xl sm:text-4xl md:text-6xl font-bold tracking-tight gradient-text">
                    Lifestyle
                  </h2>
                </div>
                <InfiniteGallery images={GALLERY_IMAGES} />
              </section>
            </ParallaxSection>
          </SectionWrapper>

          <SectionWrapper id="membership">
            <MembershipSection />
          </SectionWrapper>

          <SectionWrapper id="contact">
            <GetInTouchSection />
          </SectionWrapper>
        </main>
      </>
    </SectionThemeProvider>
  );
}
