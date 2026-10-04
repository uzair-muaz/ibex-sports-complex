"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { isStaffRole } from "@/lib/authz";

const NAV = [
  { href: "/account", label: "Profile", exact: true },
  { href: "/account/bookings", label: "My Bookings" },
  { href: "/account/rewards", label: "Rewards" },
  { href: "/account/membership", label: "Membership" },
  { href: "/account/support", label: "Support" },
];

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(`/login?callbackUrl=${encodeURIComponent(pathname)}`);
    }
  }, [status, router, pathname]);

  useEffect(() => {
    if (status === "authenticated" && isStaffRole(session?.user?.role)) {
      router.replace("/admin/bookings");
    }
  }, [status, session, router]);

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#2DD4BF]" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 md:py-14">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white md:text-3xl">
            My Account
          </h1>
          <p className="mt-1 text-sm text-zinc-400">{session?.user?.email}</p>
        </div>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/" })}
          className="text-sm text-zinc-400 hover:text-white"
        >
          Sign out
        </button>
      </div>

      <nav className="mb-8 flex gap-2 overflow-x-auto pb-1">
        {NAV.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "shrink-0 rounded-xl px-4 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-[#2DD4BF]/15 text-[#2DD4BF]"
                  : "bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {children}
    </div>
  );
}
