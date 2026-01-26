import { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { HeroSection } from "@/components/sections/HeroSection";
import { MarqueeSection } from "@/components/sections/MarqueeSection";
import { FacilitiesSection } from "@/components/sections/FacilitiesSection";
import { AmenitiesSection } from "@/components/sections/AmenitiesSection";
import { GetInTouchSection } from "@/components/sections/GetInTouchSection";
import { InfiniteGallery } from "@/components/ui/InfiniteScroll";
import { ParallaxSection } from "@/components/ui/ParallaxSection";
import { TextReveal } from "@/components/ui/TextReveal";
import { GALLERY_IMAGES } from "@/types";

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

// Static page - no server-side data fetching
// FacilitiesSection uses SWR to fetch courts client-side
export default function Home() {

  return (
    <div className="min-h-screen bg-white dark:bg-[#050505] text-black dark:text-white overflow-hidden transition-colors duration-200">
      <Navbar />

      <HeroSection />

      <div className="relative z-30">
        <MarqueeSection text="PADEL • CRICKET • PICKLEBALL • FUTSAL" />
      </div>

      <FacilitiesSection
        padelCourts={[]}
        cricketCourts={[]}
        pickleballCourts={[]}
        futsalCourts={[]}
      />

      <ParallaxSection speed={0.1}>
        <section className="py-12 sm:py-16 md:py-24 bg-white dark:bg-black overflow-hidden transition-colors duration-200">
          <div className="px-4 sm:px-6 mb-8 sm:mb-10 md:mb-12 max-w-7xl mx-auto">
            <TextReveal className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tighter gradient-text">
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
