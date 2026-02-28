"use client";

import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { DiscountBanner } from "@/components/DiscountBanner";
import { HeroSection } from "@/components/sections/HeroSection";
import { FacilitiesSection } from "@/components/sections/FacilitiesSection";
import { AmenitiesSection } from "@/components/sections/AmenitiesSection";
import { MembershipSection } from "@/components/sections/MembershipSection";
import { GetInTouchSection } from "@/components/sections/GetInTouchSection";
import { InfiniteGallery } from "@/components/ui/InfiniteScroll";
import { ParallaxSection } from "@/components/ui/ParallaxSection";
import { SectionThemeProvider } from "@/contexts/SectionThemeContext";
import { SectionWrapper } from "@/components/landing/SectionWrapper";
import { LifestyleParallaxBg } from "@/components/landing/LifestyleParallaxBg";
import { MarqueeSection } from "@/components/sections/MarqueeSection";
import { GALLERY_IMAGES } from "@/types";

export function LandingPage() {
  return (
    <SectionThemeProvider>
      <div className="min-h-screen bg-white dark:bg-[#050505] text-black dark:text-white overflow-x-hidden transition-colors duration-500">
        <Navbar />
        <DiscountBanner className="fixed top-14 sm:top-16 md:top-20 left-0 right-0 z-40" />

        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-20 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-[#2DD4BF] focus:text-[#0F172A] focus:rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2DD4BF] focus:ring-offset-2"
        >
          Skip to main content
        </a>

        <main id="main-content" className="relative" tabIndex={-1}>
          {/* 1 — Hero */}
          <SectionWrapper id="hero">
            <HeroSection />
          </SectionWrapper>

          {/* Ticker */}
          <MarqueeSection text="Paddle · Pickleball · Futsal" />

          {/* 2 — Facilities (Choose Your Arena) */}
          <SectionWrapper id="facilities">
            <FacilitiesSection />
          </SectionWrapper>

          {/* 3 — Hive Cafe (The Social Hub) */}
          <SectionWrapper id="amenities">
            <AmenitiesSection />
          </SectionWrapper>

          {/* 4 — Lifestyle gallery */}
          <SectionWrapper id="lifestyle" useChapterBg className="relative">
            <LifestyleParallaxBg />
            <ParallaxSection speed={0.1}>
              <section className="relative z-10 py-16 sm:py-24 md:py-32 lg:py-36 overflow-hidden">
                <div className="px-4 sm:px-6 mb-14 sm:mb-20 md:mb-28 max-w-7xl mx-auto">
                  <p className="text-[#2DD4BF] font-mono text-xs uppercase tracking-[0.25em] mb-6">
                    Life at Ibex
                  </p>
                  <h2 className="text-3xl sm:text-4xl md:text-6xl font-bold tracking-tight gradient-text">
                    Lifestyle
                  </h2>
                </div>
                <InfiniteGallery images={GALLERY_IMAGES} />
              </section>
            </ParallaxSection>
          </SectionWrapper>

          {/* 5 — Membership (Join the Ibex Community) */}
          <SectionWrapper id="membership">
            <MembershipSection />
          </SectionWrapper>

          {/* 6 — Get in Touch (unchanged) */}
          <SectionWrapper id="contact">
            <GetInTouchSection />
          </SectionWrapper>
        </main>

        <Footer />
      </div>
    </SectionThemeProvider>
  );
}
