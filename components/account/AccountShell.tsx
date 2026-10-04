"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useMemo, useState } from "react";
import {
  CalendarDays,
  Gift,
  Headphones,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const ACCOUNT_NAV = [
  {
    href: "/account",
    label: "Profile",
    description: "Your name, email, and phone",
    exact: true,
    icon: UserRound,
  },
  {
    href: "/account/bookings",
    label: "My Bookings",
    description: "Upcoming and past court reservations",
    icon: CalendarDays,
  },
  {
    href: "/account/rewards",
    label: "Rewards",
    description: "Loyalty points and activity",
    icon: Sparkles,
  },
  {
    href: "/account/membership",
    label: "Membership",
    description: "Hours, guest passes, and plans",
    icon: Gift,
  },
  {
    href: "/account/support",
    label: "Support",
    description: "Help and support tickets",
    icon: Headphones,
  },
] as const;

type AccountShellProps = {
  children: React.ReactNode;
};

function navActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AccountShell({ children }: AccountShellProps) {
  const { data: session } = useSession();
  const pathname = usePathname() || "/account";
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const activeItem = useMemo(
    () =>
      ACCOUNT_NAV.find((item) =>
        navActive(pathname, item.href, "exact" in item ? item.exact : false),
      ) ?? ACCOUNT_NAV[0],
    [pathname],
  );

  const userName = session?.user?.name || "Player";
  const userEmail = session?.user?.email || "";
  const userImage = session?.user?.image;

  const navigate = (href: string) => {
    router.push(href);
    setMobileOpen(false);
  };

  const sidebarBody = (opts: { collapsed: boolean; mobile?: boolean }) => (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#2DD4BF] text-[#0F172A] shadow-lg shadow-teal-500/20">
          <LayoutDashboard className="h-5 w-5" />
        </div>
        {!opts.collapsed ? (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">
              My Account
            </p>
            <p className="truncate text-[11px] text-zinc-500">
              IBEX Sports Complex
            </p>
          </div>
        ) : null}
        {opts.mobile ? (
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="ml-auto rounded-lg p-2 text-zinc-400 hover:bg-white/5 hover:text-white"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-4">
        {ACCOUNT_NAV.map((item) => {
          const active = navActive(
            pathname,
            item.href,
            "exact" in item ? item.exact : false,
          );
          const Icon = item.icon;
          return (
            <button
              key={item.href}
              type="button"
              onClick={() => navigate(item.href)}
              title={opts.collapsed ? item.label : undefined}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors",
                active
                  ? "bg-[#2DD4BF]/15 text-[#2DD4BF] ring-1 ring-[#2DD4BF]/25"
                  : "text-zinc-400 hover:bg-white/5 hover:text-white",
                opts.collapsed && "justify-center px-0",
              )}
            >
              <Icon
                className={cn(
                  "h-[18px] w-[18px] shrink-0",
                  active ? "text-[#2DD4BF]" : "text-zinc-500",
                )}
              />
              {!opts.collapsed ? <span>{item.label}</span> : null}
            </button>
          );
        })}
      </nav>

      <div className="space-y-2 border-t border-white/10 p-3">
        {!opts.collapsed ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3">
            <div className="flex items-center gap-2.5">
              {userImage ? (
                <Image
                  src={userImage}
                  alt=""
                  width={32}
                  height={32}
                  className="h-8 w-8 rounded-lg object-cover ring-1 ring-white/10"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-xs font-bold text-white">
                  {userName.slice(0, 1).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-white">
                  {userName}
                </p>
                <p className="truncate text-[11px] text-zinc-500">
                  {userEmail}
                </p>
              </div>
            </div>
          </div>
        ) : null}

        <div className="flex gap-1">
          <Link
            href="/"
            title="Home"
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm text-zinc-400 transition hover:bg-white/5 hover:text-white",
              opts.collapsed && "px-0",
            )}
          >
            <Home className="h-4 w-4" />
            {!opts.collapsed ? "Home" : null}
          </Link>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/" })}
            title="Sign out"
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm text-zinc-400 transition hover:bg-white/5 hover:text-white",
              opts.collapsed && "px-0",
            )}
          >
            <LogOut className="h-4 w-4" />
            {!opts.collapsed ? "Sign out" : null}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden border-r border-white/10 bg-zinc-950/95 backdrop-blur-xl transition-all duration-300 lg:block",
          collapsed ? "w-[72px]" : "w-64",
        )}
      >
        {sidebarBody({ collapsed })}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen ? (
        <>
          <button
            type="button"
            aria-label="Close sidebar overlay"
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-[280px] border-r border-white/10 bg-zinc-950 lg:hidden">
            {sidebarBody({ collapsed: false, mobile: true })}
          </aside>
        </>
      ) : null}

      <div
        className={cn(
          "flex min-h-screen flex-col transition-all duration-300",
          collapsed ? "lg:ml-[72px]" : "lg:ml-64",
        )}
      >
        <header className="sticky top-0 z-30 border-b border-white/10 bg-[#050505]/90 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <button
                type="button"
                className="rounded-xl border border-white/10 bg-white/5 p-2 text-zinc-300 hover:bg-white/10 hover:text-white lg:hidden"
                onClick={() => setMobileOpen(true)}
                aria-label="Open menu"
              >
                <Menu className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="hidden rounded-xl border border-white/10 bg-white/5 p-2 text-zinc-300 hover:bg-white/10 hover:text-white lg:inline-flex"
                onClick={() => setCollapsed((v) => !v)}
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {collapsed ? (
                  <PanelLeftOpen className="h-4 w-4" />
                ) : (
                  <PanelLeftClose className="h-4 w-4" />
                )}
              </button>
              <div className="min-w-0">
                <h1 className="truncate text-lg font-semibold tracking-tight text-white sm:text-xl">
                  {activeItem.label}
                </h1>
                <p className="hidden truncate text-sm text-zinc-500 sm:block">
                  {activeItem.description}
                </p>
              </div>
            </div>
            <Link
              href="/booking"
              className="shrink-0 rounded-xl bg-[#2DD4BF] px-3.5 py-2 text-sm font-semibold text-[#0F172A] transition hover:bg-[#14B8A6] sm:px-4"
            >
              Book now
            </Link>
          </div>
        </header>

        <main className="relative flex-1">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(45,212,191,0.07),_transparent_45%)]"
          />
          <div className="relative mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
