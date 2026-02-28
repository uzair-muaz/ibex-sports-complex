"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X, Lock, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "./ui/button";
import { useSectionTheme } from "@/contexts/SectionThemeContext";

export const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const sectionTheme = useSectionTheme();
  const isLightNav =
    sectionTheme?.sectionTheme === "light" && pathname === "/" && !isScrolled;

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  const navLinks = [{ name: "Home", path: "/" }];

  const textColor = isLightNav
    ? "text-[#0F172A] dark:text-[#0F172A]"
    : "text-white dark:text-white";
  const mutedColor = isLightNav
    ? "text-zinc-600 dark:text-zinc-500"
    : "text-zinc-300 dark:text-zinc-400";

  return (
    <motion.nav
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={`fixed top-0 left-0 right-0 z-[100] isolate transition-all duration-500 ${
        isLightNav
          ? "bg-white/80 dark:bg-white/80 border-b border-zinc-200/60 dark:border-zinc-200/60 backdrop-blur-xl"
          : "bg-zinc-950/80 dark:bg-zinc-950/80 border-b border-white/[0.08] backdrop-blur-xl"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 h-16 sm:h-[4.25rem] md:h-[4.25rem] flex items-center justify-between">
        {/* Logo — Ibex Sports Complex */}
        <Link href="/" className="relative group z-10 flex-shrink-0">
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2.5 sm:gap-3"
          >
            <div className="relative w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11 rounded-xl overflow-hidden ring-1 ring-black/5 dark:ring-white/10">
              <Image
                src="/logo.png"
                alt="Ibex Sports Complex"
                width={44}
                height={44}
                className="w-full h-full object-cover"
                priority
              />
            </div>
            <div className="flex flex-col leading-tight">
              <span
                className={`text-base sm:text-lg md:text-xl font-bold tracking-tight ${textColor}`}
              >
                Ibex
              </span>
              <span
                className={`hidden sm:block text-[10px] sm:text-xs font-medium tracking-wide ${mutedColor}`}
              >
                Sports Complex
              </span>
            </div>
          </motion.div>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link, index) => {
            const isActive = pathname === link.path;
            return (
              <motion.div
                key={link.path}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 + 0.2 }}
              >
                <Link
                  href={link.path}
                  className={`relative flex items-center px-4 py-2.5 rounded-xl text-sm font-medium transition-colors duration-200 ${
                    isActive
                      ? textColor
                      : isLightNav
                        ? "text-zinc-600 dark:text-zinc-500 hover:text-[#0F172A] hover:bg-zinc-100 dark:hover:bg-zinc-100"
                        : "text-zinc-300 dark:text-zinc-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {link.name}
                  {isActive && (
                    <motion.div
                      layoutId="navbarIndicator"
                      className="absolute inset-0 rounded-xl bg-white/10 dark:bg-white/10 -z-10"
                      initial={false}
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                </Link>
              </motion.div>
            );
          })}

          <div className="flex items-center gap-2 ml-2 pl-2 border-l border-zinc-200/60 dark:border-white/10">
            <Link href="/admin">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-200 ${
                  isLightNav
                    ? "text-zinc-600 dark:text-zinc-500 hover:text-[#0F172A] hover:bg-zinc-100 dark:hover:bg-zinc-100"
                    : "text-zinc-300 dark:text-zinc-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <Lock className="w-4 h-4" />
                <span>Admin</span>
              </motion.button>
            </Link>
            <Link href="/booking">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  size="sm"
                  className="rounded-xl bg-[#2DD4BF] text-[#0F172A] font-semibold px-5 py-2.5 h-10 border-0 shadow-lg shadow-[#2DD4BF]/20 hover:bg-[#14B8A6] hover:shadow-[#2DD4BF]/30 transition-all duration-200 cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    Book Now
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </Button>
              </motion.div>
            </Link>
          </div>
        </div>

        {/* Mobile: Book + Hamburger */}
        <div className="md:hidden flex items-center gap-2">
          <Link href="/booking">
            <motion.button
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2 min-h-10 px-4 rounded-xl bg-[#2DD4BF] text-[#0F172A] font-semibold text-sm shadow-lg shadow-[#2DD4BF]/20 active:bg-[#14B8A6] transition-colors"
            >
              <span>Book Now</span>
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          </Link>
          <motion.button
            whileTap={{ scale: 0.97 }}
            className="flex items-center justify-center min-h-10 min-w-10 rounded-xl bg-white/10 active:bg-white/15 transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
          >
            <AnimatePresence mode="wait">
              {isMobileMenuOpen ? (
                <motion.div
                  key="close"
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <X className="w-5 h-5" />
                </motion.div>
              ) : (
                <motion.div
                  key="menu"
                  initial={{ rotate: 90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: -90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Menu className="w-5 h-5" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </div>

      {/* Mobile Menu — portaled to body so fixed overlay/panel cover full viewport */}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {isMobileMenuOpen && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm md:hidden"
                  onClick={() => setIsMobileMenuOpen(false)}
                  aria-hidden
                />
                <motion.div
                  initial={{ x: "100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "100%" }}
                  transition={{ type: "spring", damping: 30, stiffness: 300 }}
                  className={`fixed top-0 right-0 bottom-0 z-[120] w-full max-w-sm shadow-2xl md:hidden flex flex-col ${
                    isLightNav
                      ? "bg-white dark:bg-zinc-50 border-l border-zinc-200/80"
                      : "bg-zinc-900 dark:bg-zinc-900 border-l border-white/10"
                  }`}
                >
                  {/* Sidebar header: title + close */}
                  <div
                    className={`flex items-center justify-between h-16 shrink-0 px-5 border-b ${
                      isLightNav
                        ? "border-zinc-200/80 dark:border-zinc-200/50"
                        : "border-white/10"
                    }`}
                  >
                    <span className="text-xs font-mono uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                      Menu
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center justify-center w-10 h-10 rounded-xl text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors"
                      aria-label="Close menu"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* All options in one clear sequence */}
                  <nav className="flex-1 overflow-y-auto py-4 px-4 flex flex-col gap-1">
                    {navLinks.map((link, index) => {
                      const isActive = pathname === link.path;
                      return (
                        <motion.div
                          key={link.path}
                          initial={{ opacity: 0, x: 12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.04 + 0.08 }}
                        >
                          <Link
                            href={link.path}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={`flex items-center py-3.5 px-4 rounded-xl text-base font-medium transition-colors ${
                              isActive
                                ? "text-[#2DD4BF] bg-[#2DD4BF]/10"
                                : isLightNav
                                  ? "text-zinc-800 dark:text-zinc-200 active:bg-zinc-100 dark:active:bg-white/10"
                                  : "text-white active:bg-white/10"
                            }`}
                          >
                            {link.name}
                          </Link>
                        </motion.div>
                      );
                    })}

                    <motion.div
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.16 }}
                    >
                      <Link
                        href="/booking"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center justify-center gap-2 w-full py-3.5 px-4 rounded-xl bg-[#2DD4BF] text-[#0F172A] font-semibold text-base shadow-lg shadow-[#2DD4BF]/20 active:bg-[#14B8A6] transition-colors mt-2"
                      >
                        <span>Book a Court</span>
                        <ArrowRight className="w-4 h-4 shrink-0" />
                      </Link>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 }}
                      className="mt-2"
                    >
                      <Link
                        href="/admin"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex items-center gap-3 py-3.5 px-4 rounded-xl text-base font-medium transition-colors ${
                          isLightNav
                            ? "text-zinc-600 dark:text-zinc-400 active:bg-zinc-100 dark:active:bg-white/10"
                            : "text-zinc-400 active:bg-white/10"
                        }`}
                      >
                        <Lock className="w-4 h-4 shrink-0" />
                        <span>Admin</span>
                      </Link>
                    </motion.div>
                  </nav>
                </motion.div>
              </>
            )}
          </AnimatePresence>,
          document.body
        )}
    </motion.nav>
  );
};
