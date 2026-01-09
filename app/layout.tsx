import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { getBaseUrl } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "IBEX Sports Arena - Premium Sports Court Booking",
    template: "%s | IBEX Sports Arena",
  },
  description: "Book premium Padel, Cricket, Pickleball, and Futsal courts at IBEX Sports Arena. Experience world-class facilities with professional-grade courts. Dynamic pricing available.",
  keywords: ["sports arena", "padel tennis", "cricket", "pickleball", "futsal", "court booking", "IBEX Sports Arena", "sports facility", "premium courts", "sports booking"],
  authors: [{ name: "IBEX Sports Arena" }],
  creator: "IBEX Sports Arena",
  publisher: "IBEX Sports Arena",
  metadataBase: new URL(getBaseUrl()),
  icons: {
    icon: [
      { url: "/logo.svg", type: "image/svg+xml" },
      { url: "/logo.png", type: "image/png" },
    ],
    apple: [
      { url: "/logo.png", type: "image/png" },
    ],
    shortcut: "/logo.png",
  },
  openGraph: {
    title: "IBEX Sports Arena - Premium Sports Court Booking",
    description: "Book premium sports courts at IBEX Sports Arena. Experience world-class facilities with dynamic pricing.",
    type: "website",
    locale: "en_US",
    siteName: "IBEX Sports Arena",
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
    title: "IBEX Sports Arena - Premium Sports Court Booking",
    description: "Book premium sports courts at IBEX Sports Arena. Dynamic pricing available.",
    images: ["/logo.png"],
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

