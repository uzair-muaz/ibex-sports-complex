import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { getBaseUrl } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "IBEX Arena - Premium Sports Court Booking",
    template: "%s | IBEX Arena",
  },
  description: "Book premium Padel, Cricket, and Pickleball courts at IBEX Arena. Experience world-class facilities with professional-grade courts. Dynamic pricing available.",
  keywords: ["sports arena", "padel tennis", "cricket", "pickleball", "court booking", "IBEX Arena", "sports facility", "premium courts", "sports booking"],
  authors: [{ name: "IBEX Arena" }],
  creator: "IBEX Arena",
  publisher: "IBEX Arena",
  metadataBase: new URL(getBaseUrl()),
  openGraph: {
    title: "IBEX Arena - Premium Sports Court Booking",
    description: "Book premium sports courts at IBEX Arena. Experience world-class facilities with dynamic pricing.",
    type: "website",
    locale: "en_US",
    siteName: "IBEX Arena",
    url: getBaseUrl(),
  },
  twitter: {
    card: "summary_large_image",
    title: "IBEX Arena - Premium Sports Court Booking",
    description: "Book premium sports courts at IBEX Arena. Dynamic pricing available.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
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
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

