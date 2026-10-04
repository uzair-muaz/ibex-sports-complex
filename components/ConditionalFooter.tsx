"use client";

import { usePathname } from "next/navigation";
import { Footer } from "@/components/Footer";

export function ConditionalFooter() {
  const pathname = usePathname();
  if (pathname === "/login" || pathname?.startsWith("/login/")) {
    return null;
  }
  return <Footer />;
}
