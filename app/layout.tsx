import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { getBaseUrl } from "@/lib/utils";
import { ConditionalWhatsApp } from "@/components/ConditionalWhatsApp";
import { Analytics } from "@vercel/analytics/react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "Ibex sports Complex - Premium Sports Court Booking",
    template: "%s | Ibex sports Complex",
  },
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
    "sports booking",
  ],
  authors: [{ name: "Ibex sports Complex" }],
  creator: "Ibex sports Complex",
  publisher: "Ibex sports Complex",
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
    title: "Ibex sports Complex - Premium Sports Court Booking",
    description:
      "Book premium sports courts at Ibex sports Complex. Experience world-class facilities with dynamic pricing.",
    type: "website",
    locale: "en_US",
    siteName: "Ibex sports Complex",
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
    title: "Ibex sports Complex - Premium Sports Court Booking",
    description:
      "Book premium sports courts at Ibex sports Complex. Dynamic pricing available.",
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
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          {children}
          <ConditionalWhatsApp />
          <Analytics />
        </Providers>
      </body>
    </html>
  );
}
