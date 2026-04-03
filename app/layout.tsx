import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { getBaseUrl } from "@/lib/utils";
import { WhatsAppFloat } from "@/components/WhatsAppFloat";
import { ConditionalWhatsApp } from "@/components/ConditionalWhatsApp";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "Ibex Sports Complex - Premium Sports Court Booking",
    template: "%s | Ibex Sports Complex",
  },
  description:
    "Book premium Padel, Cricket, Pickleball, and Futsal courts at Ibex Sports Complex. Experience world-class facilities with professional-grade courts in Islamabad.",
  keywords: [
    "sports arena",
    "padel tennis",
    "cricket",
    "pickleball",
    "futsal",
    "court booking",
    "Ibex Sports Complex",
    "sports facility",
    "premium courts",
    "sports booking",
  ],
  authors: [{ name: "Ibex Sports Complex" }],
  creator: "Ibex Sports Complex",
  publisher: "Ibex Sports Complex",
  metadataBase: new URL(getBaseUrl()),
  icons: {
    icon: [
      { url: "/logo.svg", type: "image/svg+xml" },
      { url: "/logo.png", type: "image/png" },
    ],
    apple: [{ url: "/logo.png", type: "image/png" }],
    shortcut: "/logo.png",
  },
  openGraph: {
    title: "Ibex Sports Complex - Premium Sports Court Booking",
    description:
      "Book premium sports courts at Ibex Sports Complex. Experience world-class facilities with dynamic pricing.",
    type: "website",
    locale: "en_US",
    siteName: "Ibex Sports Complex",
    url: getBaseUrl(),
    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 1200,
        alt: "IBEX Sports Complex Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ibex Sports Complex - Premium Sports Court Booking",
    description:
      "Book premium sports courts at Ibex Sports Complex. Dynamic pricing available.",
    images: ["/logo.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: getBaseUrl(),
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${inter.className} bg-[#050505] text-white`}>
        <Providers>
          {children}
          <ConditionalWhatsApp />
          <Analytics />
          <SpeedInsights />
        </Providers>
      </body>
    </html>
  );
}
