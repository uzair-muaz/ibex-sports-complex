"use client";

import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { Spin } from "antd";
import { AdminAntdProvider } from "@/components/admin/AdminAntdProvider";
import { QueryProvider } from "@/components/providers/QueryProvider";

function AdminAuthGate({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const isLoginPage = pathname === "/admin";

  useEffect(() => {
    if (!isLoginPage && status === "unauthenticated") {
      router.push("/admin");
    }
  }, [status, router, isLoginPage]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <Spin size="large" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return <>{children}</>;
}

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminAntdProvider>
      <QueryProvider>
        <AdminAuthGate>{children}</AdminAuthGate>
      </QueryProvider>
    </AdminAntdProvider>
  );
}
