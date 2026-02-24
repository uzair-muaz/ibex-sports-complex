import { Metadata } from "next";
import { Suspense } from "react";
import dynamic from "next/dynamic";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { DiscountBanner } from "@/components/DiscountBanner";
import { HeroSection } from "@/components/sections/HeroSection";
import { MarqueeSection } from "@/components/sections/MarqueeSection";
import { GetInTouchSection } from "@/components/sections/GetInTouchSection";
import { FacilitiesWithCourts } from "@/app/components/FacilitiesWithCourts";
import { FacilitiesSectionSkeleton } from "@/app/components/FacilitiesSectionSkeleton";

const MembershipSection = dynamic(
  () => import("@/components/sections/MembershipSection").then((m) => ({ default: m.MembershipSection })),
  { ssr: true }
);

const LifestyleSection = dynamic(
  () => import("@/app/components/LifestyleSection").then((m) => ({ default: m.LifestyleSection })),
  { ssr: true }
);

const AmenitiesSection = dynamic(
  () => import("@/components/sections/AmenitiesSection").then((m) => ({ default: m.AmenitiesSection })),
  { ssr: true }
);

export const metadata: Metadata = {
  title: "Ibex sports Complex - Premium Sports Court Booking",
  description:
    "Book premium Padel, Cricket, Pickleball, and Futsal courts at Ibex sports Complex. Experience world-class facilities with professional-grade courts. Dynamic pricing available.",
  keywords: [
    "sports arena",
    "padel tennis",
    "cricket",
    "pickleball",
    "futsal",
    "court booking",
    "Ibex sports Complex",
    "sports facility",
    "premium courts",
  ],
  openGraph: {
    title: "Ibex sports Complex - Premium Sports Court Booking",
    description:
      "Book premium sports courts at Ibex sports Complex. Experience world-class facilities with dynamic pricing.",
    type: "website",
    locale: "en_US",
    siteName: "Ibex sports Complex",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ibex sports Complex - Premium Sports Court Booking",
    description: "Book premium sports courts at Ibex sports Complex",
  },
};

// ISR (Incremental Static Regeneration) - Revalidate every 15 minutes
// This enables hybrid rendering: static HTML for SEO + dynamic data updates
export const revalidate = 900; // 15 minutes = 900 seconds

export default function Home() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#050505] text-black dark:text-white overflow-hidden transition-colors duration-200">
      <Navbar />
      <DiscountBanner className="fixed top-16 md:top-20 left-0 right-0 z-40" />

      <HeroSection />

      <div className="relative z-30">
        <MarqueeSection text="PADEL • PICKLEBALL • FUTSAL" />
      </div>

      <Suspense fallback={<FacilitiesSectionSkeleton />}>
        <FacilitiesWithCourts />
      </Suspense>

      <MembershipSection />

      <LifestyleSection />

      <AmenitiesSection />

      <GetInTouchSection />

      <Footer />
    </div>
  );
}
