"use client";

import React, { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  MessageSquare,
  Activity,
  Users,
  TrendingUp,
  LogOut,
  Menu,
  X,
  RefreshCw,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
  description?: string;
  onRefresh?: () => void;
  isLoading?: boolean;
  actionButton?: React.ReactNode;
}

export function AdminLayout({
  children,
  title,
  description,
  onRefresh,
  isLoading = false,
  actionButton,
}: AdminLayoutProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const userRole = (session?.user as any)?.role;
  const isSuperAdmin = userRole === "super_admin";

  const sidebarItems = [
    ...(isSuperAdmin
      ? [
          {
            id: "analytics",
            label: "Analytics",
            icon: TrendingUp,
            path: "/admin/analytics",
          },
        ]
      : []),
    {
      id: "bookings",
      label: "Bookings",
      icon: Calendar,
      path: "/admin/bookings",
    },
    {
      id: "discounts",
      label: "Discounts",
      icon: Tag,
      path: "/admin/discounts",
    },
    {
      id: "feedback",
      label: "Feedback",
      icon: MessageSquare,
      path: "/admin/feedback",
    },
    ...(isSuperAdmin
      ? [
          {
            id: "courts",
            label: "Courts",
            icon: Activity,
            path: "/admin/courts",
          },
          { id: "users", label: "Users", icon: Users, path: "/admin/users" },
        ]
      : []),
  ];

  useEffect(() => {
    if (typeof window !== "undefined") {
      setSidebarOpen(window.innerWidth >= 1024);

      const handleResize = () => {
        if (window.innerWidth >= 1024) {
          setSidebarOpen(true);
        } else {
          setSidebarOpen(false);
        }
      };

      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, []);

  const handleNavClick = (path: string) => {
    router.push(path);
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  const isActive = (path: string) => pathname === path;

  return (
    <div className="min-h-screen bg-black text-white flex overflow-hidden">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        } ${
          sidebarOpen ? "w-64" : "w-0 lg:w-64"
        } bg-zinc-950 border-r border-zinc-800 transition-all duration-300 overflow-hidden shrink-0 fixed left-0 top-0 h-screen z-50`}
      >
        <div className="h-full flex flex-col overflow-y-auto">
          {/* Sidebar Header */}
          <div className="p-4 sm:p-6 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#2DD4BF] rounded-lg flex items-center justify-center shrink-0">
                <LayoutDashboard className="w-6 h-6 text-[#0F172A]" />
              </div>
              <div>
                <h2 className="font-bold text-white text-base sm:text-lg">
                  Admin Panel
                </h2>
                <p className="text-xs text-zinc-400">
                  {isSuperAdmin ? "Super Admin" : "Admin"}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden shrink-0"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 p-3 sm:p-4 space-y-2 overflow-y-auto">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.path)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    isActive(item.path)
                      ? "bg-[#2DD4BF]/20 text-[#2DD4BF] border border-[#2DD4BF]/30"
                      : "text-zinc-400 hover:text-white hover:bg-zinc-900/50"
                  }`}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  <span className="font-medium">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Sidebar Footer */}
          <div className="p-3 sm:p-4 border-t border-zinc-800 shrink-0">
            <div className="mb-3 px-4 py-2 bg-zinc-900/50 rounded-lg">
              <p className="text-xs text-zinc-400 mb-1">Logged in as</p>
              <p className="text-sm font-medium text-white">
                {(session?.user as any)?.name || (session?.user as any)?.email}
              </p>
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start text-zinc-400 hover:text-white text-sm"
              onClick={() => signOut()}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden w-full lg:ml-64 transition-all duration-300">
        {/* Top Bar */}
        <header className="bg-zinc-950 border-b border-zinc-800 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden shrink-0"
            >
              <Menu className="w-5 h-5" />
            </Button>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-white truncate">
                {title}
              </h1>
              {description && (
                <p className="text-xs sm:text-sm text-zinc-400 hidden sm:block">
                  {description}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {onRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={isLoading}
                className="border-zinc-800 text-xs sm:text-sm"
              >
                <RefreshCw
                  className={`w-3 h-3 sm:w-4 sm:h-4 ${isLoading ? "animate-spin" : ""} sm:mr-2`}
                />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
            )}
            {actionButton}
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto bg-black">
          <div className="p-4 sm:p-6 space-y-6 sm:space-y-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
