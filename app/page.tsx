import { Metadata } from "next";
import { LandingPage } from "@/components/landing/LandingPage";

export const metadata: Metadata = {
  title: "Ibex Sports Complex - Premium Sports Court Booking",
  description:
    "Book premium Paddle Tennis, Pickleball, and Futsal courts at Ibex Sports Complex. Experience world-class facilities in Islamabad.",
  keywords: [
    "sports arena",
    "paddle tennis",
    "pickleball",
    "futsal",
    "court booking",
    "Ibex Sports Complex",
    "sports facility",
    "premium courts",
    "Islamabad",
  ],
  openGraph: {
    title: "Ibex Sports Complex - Premium Sports Court Booking",
    description:
      "Book premium sports courts at Ibex Sports Complex. World-class facilities in Islamabad.",
    type: "website",
    locale: "en_US",
    siteName: "Ibex Sports Complex",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ibex Sports Complex - Premium Sports Court Booking",
    description: "Book premium sports courts at Ibex Sports Complex",
  },
};

export default function Home() {
  return <LandingPage />;
}
