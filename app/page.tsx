import { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { DiscountBanner } from "@/components/DiscountBanner";
import { HeroSection } from "@/components/sections/HeroSection";
import { MarqueeSection } from "@/components/sections/MarqueeSection";
import { FacilitiesSection } from "@/components/sections/FacilitiesSection";
import { AmenitiesSection } from "@/components/sections/AmenitiesSection";
import { GetInTouchSection } from "@/components/sections/GetInTouchSection";
import { InfiniteGallery } from "@/components/ui/InfiniteScroll";
import { ParallaxSection } from "@/components/ui/ParallaxSection";
import { TextReveal } from "@/components/ui/TextReveal";
import { GALLERY_IMAGES } from "@/types";
import { getCourts } from "./actions/courts";

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

export default async function Home() {
  // Server-side: Fetch only prices from DB
  const result = await getCourts();
  const courts = result.success ? result.courts : [];

  const padelCourts = courts.filter((c: any) => c.type === "PADEL");
  const cricketCourts = courts.filter((c: any) => c.type === "CRICKET");
  const pickleballCourts = courts.filter((c: any) => c.type === "PICKLEBALL");
  const futsalCourts = courts.filter((c: any) => c.type === "FUTSAL");

  return (
    <div className="min-h-screen bg-white dark:bg-[#050505] text-black dark:text-white overflow-hidden transition-colors duration-200">
      <Navbar />
      <DiscountBanner className="fixed top-16 md:top-20 left-0 right-0 z-40" />

      <HeroSection />

      <div className="relative z-30">
        <MarqueeSection text="PADEL • PICKLEBALL • FUTSAL" />
      </div>

      <FacilitiesSection
        padelCourts={padelCourts}
        cricketCourts={cricketCourts}
        pickleballCourts={pickleballCourts}
        futsalCourts={futsalCourts}
      />

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

      <AmenitiesSection />

      <GetInTouchSection />

      <Footer />
    </div>
  );
}
