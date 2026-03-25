"use client";

import { Navbar } from "@/components/Navbar";
import { DiscountBanner } from "@/components/DiscountBanner";
import { Footer } from "@/components/Footer";

type PublicSiteShellProps = {
  children: React.ReactNode;
};

export function PublicSiteShell({ children }: PublicSiteShellProps) {
  return (
    <div className="min-h-screen bg-[#050505] text-white overflow-x-hidden">
      <Navbar />
      <DiscountBanner className="fixed left-0 right-0 z-40 top-16 sm:top-17" />
      {children}
      <Footer />
    </div>
  );
}
