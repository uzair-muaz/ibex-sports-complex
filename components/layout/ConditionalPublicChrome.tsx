"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { DiscountBanner } from "@/components/DiscountBanner";
import { Footer } from "@/components/Footer";

type ConditionalPublicChromeProps = {
  children: React.ReactNode;
};

/** Hides marketing chrome on app-like routes (account dashboard). */
export function ConditionalPublicChrome({
  children,
}: ConditionalPublicChromeProps) {
  const pathname = usePathname() || "";
  const isAccount = pathname.startsWith("/account");
  const isAuthPage =
    pathname === "/login" ||
    pathname.startsWith("/login/") ||
    pathname === "/forgot-password" ||
    pathname.startsWith("/forgot-password/") ||
    pathname === "/reset-password" ||
    pathname.startsWith("/reset-password/");

  // Account dashboard — no marketing chrome
  if (isAccount) {
    return <>{children}</>;
  }

  // Auth pages — navbar only (no discount banner / footer)
  if (isAuthPage) {
    return (
      <>
        <Navbar />
        {children}
      </>
    );
  }

  return (
    <>
      <Navbar />
      <DiscountBanner className="fixed inset-x-0 top-16 z-40 sm:top-[4.5rem]" />
      {children}
      <Footer />
    </>
  );
}
