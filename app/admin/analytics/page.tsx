"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { DollarSign, Users, TrendingUp } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getAllBookings } from "../../actions/bookings";
import { getAllCourts } from "../../actions/courts";
import type { Booking, Court } from "@/types";
import { formatLocalDate } from "@/lib/utils";

export default function AnalyticsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [courts, setCourts] = useState<Court[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const userRole = (session?.user as any)?.role;
  const isSuperAdmin = userRole === "super_admin";

  useEffect(() => {
    if (session) {
      if (!isSuperAdmin) {
        router.push("/admin/bookings");
        return;
      }
      loadData();
    }
  }, [session, isSuperAdmin, router]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [bookingsResult, courtsResult] = await Promise.all([
        getAllBookings(),
        getAllCourts(),
      ]);

      if (bookingsResult.success) {
        setBookings(bookingsResult.bookings);
      }
      if (courtsResult.success) {
        setCourts(courtsResult.courts);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isSuperAdmin) {
    return null;
  }

  const calculateStats = () => {
    // Use actual received amount (online + cash) so analytics match manual sheet
    const getReceivedAmount = (b: Booking) => {
      const online = b.amountReceivedOnline ?? 0;
      const cash = b.amountReceivedCash ?? 0;
      return online + cash > 0 ? online + cash : (b.amountPaid ?? 0);
    };

    const revenueBookings = bookings.filter((b) => b.status === "completed");
    const totalRevenue = revenueBookings.reduce(
      (sum, b) => sum + getReceivedAmount(b),
      0
    );
    const confirmedBookings = bookings.filter((b) => b.status === "confirmed");
    const todayBookings = bookings.filter(
      (b) => b.date === formatLocalDate(new Date())
    );

    const userBookingCounts: {
      [key: string]: {
        email: string;
        name: string;
        count: number;
        revenue: number;
      };
    } = {};
    bookings.forEach((booking) => {
      if (booking.status !== "completed") return;
      const key = booking.userEmail.toLowerCase();
      if (!userBookingCounts[key]) {
        userBookingCounts[key] = {
          email: booking.userEmail,
          name: booking.userName,
          count: 0,
          revenue: 0,
        };
      }
      userBookingCounts[key].count++;
      userBookingCounts[key].revenue += getReceivedAmount(booking);
    });
    const topUsers = Object.values(userBookingCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const revenueByType: { [key: string]: number } = {};
    revenueBookings.forEach((booking) => {
      const courtType =
        typeof booking.courtId === "object" &&
        booking.courtId &&
        "type" in booking.courtId
          ? (booking.courtId as Court).type || "UNKNOWN"
          : "UNKNOWN";
      revenueByType[courtType] =
        (revenueByType[courtType] || 0) + getReceivedAmount(booking);
    });

    const bookingsByStatus = {
      confirmed: bookings.filter((b) => b.status === "confirmed").length,
      cancelled: bookings.filter((b) => b.status === "cancelled").length,
      completed: bookings.filter((b) => b.status === "completed").length,
    };

    const avgBookingValue =
      revenueBookings.length > 0 ? totalRevenue / revenueBookings.length : 0;

    const courtTypeCounts: { [key: string]: number } = {};
    bookings.forEach((booking) => {
      const courtType =
        typeof booking.courtId === "object" &&
        booking.courtId &&
        "type" in booking.courtId
          ? (booking.courtId as Court).type || "UNKNOWN"
          : "UNKNOWN";
      courtTypeCounts[courtType] = (courtTypeCounts[courtType] || 0) + 1;
    });
    const mostPopularCourtType =
      Object.entries(courtTypeCounts).sort(([, a], [, b]) => b - a)[0]?.[0] ||
      "N/A";

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const thisMonthRevenue = revenueBookings
      .filter((b) => {
        const bookingDate = new Date(b.date);
        return (
          bookingDate.getMonth() === currentMonth &&
          bookingDate.getFullYear() === currentYear
        );
      })
      .reduce((sum, b) => sum + getReceivedAmount(b), 0);

    return {
      totalRevenue,
      confirmedBookings: confirmedBookings.length,
      todayBookings: todayBookings.length,
      totalBookings: bookings.length,
      activeCourts: courts.filter((c) => c.isActive).length,
      totalCourts: courts.length,
      topUsers,
      revenueByType,
      bookingsByStatus,
      avgBookingValue,
      mostPopularCourtType,
      thisMonthRevenue,
    };
  };

  const stats = calculateStats();

  return (
    <AdminLayout
      title="Analytics Dashboard"
      description="Super Admin exclusive insights"
      onRefresh={loadData}
      isLoading={isLoading}
    >
      {/* Dashboard Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card className="border-zinc-800 bg-zinc-950">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 bg-[#2DD4BF]/20 rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-[#2DD4BF]" />
              </div>
            </div>
            <CardDescription className="text-zinc-400">
              Total Revenue
            </CardDescription>
            <CardTitle className="text-3xl text-[#2DD4BF]">
              PKR{" "}
              {stats.totalRevenue.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </CardTitle>
            <p className="text-xs text-zinc-400 mt-2">
              {stats.confirmedBookings} confirmed
            </p>
          </CardHeader>
        </Card>

        <Card className="border-zinc-800 bg-zinc-950">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 bg-[#2DD4BF]/20 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-[#2DD4BF]" />
              </div>
            </div>
            <CardDescription className="text-zinc-400">
              Total Bookings
            </CardDescription>
            <CardTitle className="text-3xl text-white">
              {stats.totalBookings}
            </CardTitle>
            <p className="text-xs text-zinc-400 mt-2">
              {stats.todayBookings} today
            </p>
          </CardHeader>
        </Card>

        <Card className="border-zinc-800 bg-zinc-950">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 bg-[#2DD4BF]/20 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-[#2DD4BF]" />
              </div>
            </div>
            <CardDescription className="text-zinc-400">
              Active Courts
            </CardDescription>
            <CardTitle className="text-3xl text-[#2DD4BF]">
              {stats.activeCourts}
            </CardTitle>
            <p className="text-xs text-zinc-400 mt-2">
              {stats.totalCourts} total
            </p>
          </CardHeader>
        </Card>

        <Card className="border-zinc-800 bg-zinc-950">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 bg-[#2DD4BF]/20 rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-[#2DD4BF]" />
              </div>
            </div>
            <CardDescription className="text-zinc-400">
              Avg Booking Value
            </CardDescription>
            <CardTitle className="text-3xl text-[#2DD4BF]">
              PKR{" "}
              {stats.avgBookingValue.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </CardTitle>
            <p className="text-xs text-zinc-400 mt-2">
              Per booking
            </p>
          </CardHeader>
        </Card>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <Card className="border-zinc-800 bg-black/40">
          <CardHeader>
            <CardDescription className="text-zinc-400">
              This Month Revenue
            </CardDescription>
            <CardTitle className="text-2xl text-[#2DD4BF]">
              PKR{" "}
              {stats.thisMonthRevenue.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="border-zinc-800 bg-black/40">
          <CardHeader>
            <CardDescription className="text-zinc-400">
              Most Popular Court
            </CardDescription>
            <CardTitle className="text-2xl text-[#2DD4BF]">
              {stats.mostPopularCourtType}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="border-zinc-800 bg-black/40">
          <CardHeader>
            <CardDescription className="text-zinc-400">
              Bookings by Status
            </CardDescription>
            <CardContent className="pt-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#2DD4BF]"></div>
                    <span className="text-sm text-white">Confirmed</span>
                  </div>
                  <span className="font-semibold text-white">
                    {stats.bookingsByStatus.confirmed}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-zinc-500"></div>
                    <span className="text-sm text-white">Cancelled</span>
                  </div>
                  <span className="font-semibold text-white">
                    {stats.bookingsByStatus.cancelled}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-zinc-400"></div>
                    <span className="text-sm text-white">Completed</span>
                  </div>
                  <span className="font-semibold text-white">
                    {stats.bookingsByStatus.completed}
                  </span>
                </div>
              </div>
            </CardContent>
          </CardHeader>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card className="border-zinc-800 bg-black/40">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-white">
              <Users className="w-5 h-5 text-[#2DD4BF]" />
              Top Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.topUsers.length === 0 ? (
                <p className="text-zinc-400 text-sm">No bookings yet</p>
              ) : (
                stats.topUsers.map((user, index) => (
                  <div
                    key={user.email}
                    className="flex items-center justify-between p-3 bg-zinc-900/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-[#2DD4BF]/20 rounded-full flex items-center justify-center text-[#2DD4BF] font-bold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium text-white text-sm">
                          {user.name}
                        </div>
                        <div className="text-xs text-zinc-500">
                          {user.email}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-white">
                        {user.count} bookings
                      </div>
                      <div className="text-xs text-[#2DD4BF]">
                        PKR {user.revenue.toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-black/40">
          <CardHeader>
            <CardTitle className="text-lg text-white">
              Revenue by Court Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(stats.revenueByType).map(([type, revenue]) => (
                <div
                  key={type}
                  className="flex items-center justify-between"
                >
                  <Badge
                    variant="outline"
                    className="bg-zinc-900/50 border-zinc-800 text-zinc-200"
                  >
                    {type}
                  </Badge>
                  <span className="text-[#2DD4BF] font-semibold">
                    PKR{" "}
                    {revenue.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
