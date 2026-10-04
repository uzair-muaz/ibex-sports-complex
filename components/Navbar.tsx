"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Menu, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { name: "Home", path: "/" },
  { name: "Book Now", path: "/booking" },
] as const;

function UserAvatar({
  name,
  image,
  className,
}: {
  name?: string | null;
  image?: string | null;
  className?: string;
}) {
  const initials = (name || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  if (image) {
    return (
      <Image
        src={image}
        alt={name || "Account"}
        width={36}
        height={36}
        className={cn("h-9 w-9 rounded-full object-cover", className)}
      />
    );
  }

  return (
    <span
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#2DD4BF]/20 text-xs font-bold text-[#2DD4BF] ring-1 ring-[#2DD4BF]/30",
        className,
      )}
    >
      {initials || "?"}
    </span>
  );
}

export const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const { data: session, status } = useSession();

  const isCustomer =
    status === "authenticated" &&
    session?.user?.role !== "admin" &&
    session?.user?.role !== "super_admin";
  const isStaff =
    status === "authenticated" &&
    (session?.user?.role === "admin" ||
      session?.user?.role === "super_admin");
  const isLoggedIn = status === "authenticated";

  const accountHref = isStaff
    ? "/admin/bookings"
    : isCustomer
      ? "/account"
      : "/login";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setAccountOpen(false);
  }, [pathname]);

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-100 transition-all duration-500",
          scrolled
            ? "bg-[#050505]/75 backdrop-blur-md"
            : "bg-transparent",
        )}
      >
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/45 to-transparent transition-opacity duration-500",
            scrolled ? "opacity-100" : "opacity-70",
          )}
        />

        <div className="relative mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-5 sm:h-[4.5rem] sm:px-8">
          {/* Left: logo */}
          <Link href="/" className="flex min-w-0 items-center gap-2.5">
            <Image
              src="/logo.png"
              alt="IBEX Sports Complex"
              width={36}
              height={36}
              className="h-9 w-9 shrink-0 rounded-full object-cover"
              priority
            />
            <span className="truncate text-sm font-bold tracking-tight text-white sm:text-[15px]">
              IBEX Sports Complex
            </span>
          </Link>

          {/* Right: nav links + Sign in / avatar / mobile menu */}
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <nav className="hidden items-center gap-1 md:flex">
              {NAV_LINKS.map((link) => {
                const active =
                  link.path === "/"
                    ? pathname === "/"
                    : pathname === link.path ||
                      pathname.startsWith(`${link.path}/`);
                return (
                  <Link
                    key={link.path}
                    href={link.path}
                    className={cn(
                      "relative rounded-full px-3.5 py-2 text-sm font-medium tracking-wide transition-colors",
                      active
                        ? "text-white"
                        : "text-white/50 hover:text-white/90",
                    )}
                  >
                    {link.name}
                    {active ? (
                      <motion.span
                        layoutId="nav-line"
                        className="absolute inset-x-3.5 -bottom-0.5 h-px bg-[#2DD4BF]"
                        transition={{
                          type: "spring",
                          stiffness: 380,
                          damping: 32,
                        }}
                      />
                    ) : null}
                  </Link>
                );
              })}
            </nav>

            <div className="hidden items-center md:flex">
              {!isLoggedIn ? (
                <Link
                  href="/login"
                  className="inline-flex h-9 items-center rounded-full bg-[#2DD4BF] px-5 text-sm font-semibold text-[#0F172A] transition hover:bg-[#14B8A6]"
                >
                  Sign In
                </Link>
              ) : (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setAccountOpen((v) => !v)}
                    className="flex items-center gap-2.5 rounded-full py-1 pl-1 pr-2.5 transition hover:bg-white/5"
                    aria-expanded={accountOpen}
                    aria-haspopup="menu"
                  >
                    <UserAvatar
                      name={session?.user?.name}
                      image={session?.user?.image}
                    />
                    <span className="max-w-[140px] truncate text-sm font-medium text-white/85">
                      {session?.user?.name?.split(" ")[0] || "Account"}
                    </span>
                  </button>

                  <AnimatePresence>
                    {accountOpen ? (
                      <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 6 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-full mt-2 min-w-[180px] overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/95 py-1 shadow-2xl backdrop-blur-xl"
                        role="menu"
                      >
                        <Link
                          href={accountHref}
                          className="block px-4 py-2.5 text-sm text-white/80 transition hover:bg-white/5 hover:text-white"
                          role="menuitem"
                          onClick={() => setAccountOpen(false)}
                        >
                          {isStaff ? "Admin dashboard" : "My account"}
                        </Link>
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setAccountOpen(false);
                            void signOut({ callbackUrl: "/" });
                          }}
                          className="block w-full px-4 py-2.5 text-left text-sm text-white/50 transition hover:bg-white/5 hover:text-white"
                        >
                          Sign out
                        </button>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center text-white/80 transition hover:text-white md:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </header>

      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {isMobileMenuOpen ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="fixed inset-0 z-120 flex flex-col bg-[#050505]/95 backdrop-blur-xl md:hidden"
              >
                <div className="flex h-16 items-center justify-between px-5">
                  <Link
                    href="/"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-2.5"
                  >
                    <Image
                      src="/logo.png"
                      alt=""
                      width={32}
                      height={32}
                      className="h-8 w-8 rounded-full object-cover"
                    />
                    <span className="text-sm font-bold text-white">
                      IBEX Sports Complex
                    </span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="inline-flex h-10 w-10 items-center justify-center text-white/70"
                    aria-label="Close menu"
                  >
                    <X className="h-5 w-5" strokeWidth={1.5} />
                  </button>
                </div>

                <nav className="flex flex-1 flex-col justify-center gap-1 px-8">
                  {NAV_LINKS.map((link, i) => {
                    const active =
                      link.path === "/"
                        ? pathname === "/"
                        : pathname.startsWith(link.path);
                    return (
                      <motion.div
                        key={link.path}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.05 + i * 0.05 }}
                      >
                        <Link
                          href={link.path}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={cn(
                            "block py-3 text-4xl font-light tracking-tight",
                            active ? "text-[#2DD4BF]" : "text-white/90",
                          )}
                        >
                          {link.name}
                        </Link>
                      </motion.div>
                    );
                  })}

                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.18 }}
                    className="mt-10 border-t border-white/10 pt-8"
                  >
                    {!isLoggedIn ? (
                      <Link
                        href="/login"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="inline-flex h-11 w-full items-center justify-center rounded-full bg-[#2DD4BF] text-base font-semibold text-[#0F172A]"
                      >
                        Sign In
                      </Link>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <UserAvatar
                            name={session?.user?.name}
                            image={session?.user?.image}
                          />
                          <div className="min-w-0">
                            <p className="truncate text-base font-semibold text-white">
                              {session?.user?.name || "Account"}
                            </p>
                            <p className="truncate text-sm text-white/45">
                              {session?.user?.email}
                            </p>
                          </div>
                        </div>
                        <Link
                          href={accountHref}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="inline-flex h-11 w-full items-center justify-center rounded-full border border-white/20 text-base font-semibold text-white"
                        >
                          {isStaff ? "Admin dashboard" : "My account"}
                        </Link>
                        <button
                          type="button"
                          onClick={() => {
                            setIsMobileMenuOpen(false);
                            void signOut({ callbackUrl: "/" });
                          }}
                          className="w-full py-2 text-center text-base text-white/45"
                        >
                          Sign out
                        </button>
                      </div>
                    )}
                  </motion.div>
                </nav>
              </motion.div>
            ) : null}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
};
