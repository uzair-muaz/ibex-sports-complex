"use client";

import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  // Don't apply auth check to the login page itself
  const isLoginPage = pathname === "/admin";

  useEffect(() => {
    // Only redirect if not on login page and unauthenticated
    if (!isLoginPage && status === "unauthenticated") {
      router.push("/admin");
    }
  }, [status, router, isLoginPage]);

  // If on login page, always render children (the login form)
  if (isLoginPage) {
    return <>{children}</>;
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Loader2 className="h-12 w-12 animate-spin text-[#2DD4BF]" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return <>{children}</>;
}
