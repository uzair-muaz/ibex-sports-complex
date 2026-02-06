"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X, Lock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "./ui/button";
import { LUXURY_EASE } from "@/lib/motion";

export const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [{ name: "Home", path: "/" }];

  return (
    <motion.nav
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: LUXURY_EASE }}
      className={`fixed top-0 left-0 right-0 z-50 backdrop-blur-xl border-b border-white/10 transition-all duration-300 ${isScrolled ? "bg-black/80 dark:bg-black/80" : "bg-black/95 dark:bg-black/95"}`}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-8 h-16 md:h-20 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="relative group z-10">
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-3"
          >
            <div className="relative w-10 h-10 md:w-12 md:h-12">
              <Image
                src="/logo.png"
                alt="IBEX Sports Complex Logo"
                width={48}
                height={48}
                className="w-full h-full"
                priority
              />
            </div>
            <motion.span
              className="text-xl md:text-2xl font-black tracking-tighter text-white dark:text-white"
              whileHover={{ color: "#2DD4BF" }}
              transition={{ duration: 0.3, ease: LUXURY_EASE }}
            >
              IBEX
            </motion.span>
          </motion.div>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-6">
          {navLinks.map((link, index) => {
            const isActive = pathname === link.path;
            return (
              <motion.div
                key={link.path}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 + 0.3, ease: LUXURY_EASE }}
              >
                <Link href={link.path} className="relative group">
                  <motion.span
                    className={`relative text-sm font-medium tracking-wide px-4 py-2 rounded-lg transition-all duration-300 ${
                      isActive
                        ? "text-white"
                        : "text-zinc-300 dark:text-zinc-400"
                    }`}
                    whileHover={{ color: "#2DD4BF" }}
                  >
                    {link.name}
                    {/* Active indicator */}
                    {isActive && (
                      <motion.div
                        layoutId="navbarIndicator"
                        className="absolute -bottom-1 left-0 right-0 h-0.5 bg-[#2DD4BF] rounded-full"
                        initial={false}
                        transition={{
                          type: "spring",
                          stiffness: 500,
                          damping: 30,
                        }}
                      />
                    )}
                  </motion.span>
                </Link>
              </motion.div>
            );
          })}

          {/* Admin Button */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, ease: LUXURY_EASE }}
          >
            <Link href="/admin">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                className="relative px-4 py-2 rounded-lg text-zinc-300 dark:text-zinc-400 hover:text-[#2DD4BF] hover:bg-white/5 dark:hover:bg-white/5 transition-all duration-300 group cursor-pointer flex items-center gap-2"
              >
                <Lock className="w-4 h-4" />
                <span className="text-sm font-medium">Admin</span>
                <motion.div
                  className="absolute inset-0 bg-[#2DD4BF]/10 rounded-lg opacity-0 group-hover:opacity-100"
                  transition={{ duration: 0.3, ease: LUXURY_EASE }}
                />
              </motion.button>
            </Link>
          </motion.div>

          {/* Book Now Button */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, ease: LUXURY_EASE }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
          >
            <Link href="/booking">
              <Button
                size="sm"
                className="relative overflow-hidden bg-[#2DD4BF] text-[#0F172A] font-bold px-6 py-2.5 rounded-lg border-0 shadow-lg shadow-[#2DD4BF]/25 hover:shadow-[#2DD4BF]/40 transition-all duration-300 group cursor-pointer"
              >
                <span className="relative z-10 flex items-center gap-2">
                  Book Now
                  <motion.span
                    animate={{ x: [0, 4, 0] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                  >
                    →
                  </motion.span>
                </span>
                {/* Hover gradient overlay */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-[#14B8A6] to-[#2DD4BF] opacity-0 group-hover:opacity-100"
                  transition={{ duration: 0.3, ease: LUXURY_EASE }}
                />
                {/* Shine effect - slower for premium feel */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                  animate={{ x: ["-200%", "200%"] }}
                  transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
                />
              </Button>
            </Link>
          </motion.div>
        </div>

        {/* Mobile Menu Toggle */}
        <div className="md:hidden flex items-center gap-3">
          {/* Book Now Mobile (primary action) */}
          <Link href="/booking">
            <motion.button
              whileTap={{ scale: 0.9 }}
              className="relative px-3 py-2 rounded-lg bg-[#2DD4BF] text-[#0F172A] font-semibold text-sm hover:bg-[#14B8A6] transition-colors cursor-pointer flex items-center gap-2"
            >
              <span>Book Now</span>
            </motion.button>
          </Link>

          <motion.button
            whileTap={{ scale: 0.9 }}
            className="relative p-2 rounded-lg text-white hover:bg-white/10 transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
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
                  <X className="w-6 h-6" />
                </motion.div>
              ) : (
                <motion.div
                  key="menu"
                  initial={{ rotate: 90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: -90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Menu className="w-6 h-6" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="md:hidden absolute top-16 left-0 right-0 bg-black/95 backdrop-blur-xl border-t border-white/10 overflow-hidden"
          >
            <div className="px-6 py-8 flex flex-col gap-6">
              {navLinks.map((link, index) => {
                const isActive = pathname === link.path;
                return (
                  <motion.div
                    key={link.path}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Link
                      href={link.path}
                      className={`relative text-2xl font-bold transition-colors ${
                        isActive ? "text-[#2DD4BF]" : "text-white"
                      } hover:text-[#2DD4BF]`}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {link.name}
                      {isActive && (
                        <motion.div
                          className="absolute -left-4 top-1/2 -translate-y-1/2 w-1 h-8 bg-[#2DD4BF] rounded-r-full"
                          layoutId="mobileActiveIndicator"
                          initial={false}
                        />
                      )}
                    </Link>
                  </motion.div>
                );
              })}
              {/* Admin inside mobile menu */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Link href="/admin" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button className="w-full bg-white/5 text-white font-medium py-4 text-base rounded-xl hover:bg-white/10 transition-all duration-200 cursor-pointer flex items-center justify-center gap-2">
                    <Lock className="w-4 h-4" />
                    <span>Admin</span>
                  </Button>
                </Link>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};
