"use client";

import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { Spin, theme } from "antd";
import { AdminAntdProvider } from "@/components/admin/AdminAntdProvider";
import { isStaffRole } from "@/lib/authz";

function AdminAuthGate({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const { token } = theme.useToken();
  const isLoginPage = pathname === "/admin";

  useEffect(() => {
    if (!isLoginPage && status === "unauthenticated") {
      router.replace("/admin");
    }
    if (
      !isLoginPage &&
      status === "authenticated" &&
      !isStaffRole(session?.user?.role)
    ) {
      router.replace("/account");
    }
  }, [status, router, isLoginPage, session]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (status === "loading") {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ background: token.colorBgBase }}
      >
        <Spin size="large" />
      </div>
    );
  }

  if (!session || !isStaffRole(session.user?.role)) {
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
      <AdminAuthGate>{children}</AdminAuthGate>
    </AdminAntdProvider>
  );
}
