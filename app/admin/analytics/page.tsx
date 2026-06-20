"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Card,
  Button,
  Modal,
  DatePicker,
  Segmented,
  Statistic,
  Tag,
  Typography,
  Flex,
  Space,
} from "antd";
import {
  DollarOutlined,
  TeamOutlined,
  RiseOutlined,
  CreditCardOutlined,
  BankOutlined,
  CalendarOutlined,
  UserOutlined,
} from "@ant-design/icons";
import type { Dayjs } from "dayjs";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { getAllBookings } from "../../actions/bookings";
import { getAllCourts } from "../../actions/courts";
import type { Booking, Court } from "@/types";
import {
  getTodayRange,
  getCurrentWeekRange,
  getCurrentMonthRange,
  getCurrentYearRange,
  getRangeFromDates,
  isDateInRange,
} from "@/lib/date-range-utils";

const { Text } = Typography;

const formatPkr = (value: number) =>
  `PKR ${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

type TimeFilter = "all" | "today" | "week" | "month" | "year" | "range";

const TIME_FILTER_OPTIONS: { label: string; value: TimeFilter }[] = [
  { label: "All", value: "all" },
  { label: "Today", value: "today" },
  { label: "This Week", value: "week" },
  { label: "This Month", value: "month" },
  { label: "This Year", value: "year" },
  { label: "Custom Range", value: "range" },
];

export default function AnalyticsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [courts, setCourts] = useState<Court[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("month");
  const [customRange, setCustomRange] = useState<
    [Dayjs | null, Dayjs | null] | null
  >(null);
  const [showRangeModal, setShowRangeModal] = useState(false);

  const userRole = (session?.user as { role?: string })?.role;
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

  const getActiveDateRange = () => {
    const now = new Date();
    if (timeFilter === "all") {
      return null;
    }
    if (timeFilter === "today") {
      return getTodayRange(now);
    }
    if (timeFilter === "week") {
      return getCurrentWeekRange(now);
    }
    if (timeFilter === "month") {
      return getCurrentMonthRange(now);
    }
    if (timeFilter === "year") {
      return getCurrentYearRange(now);
    }
    if (timeFilter === "range") {
      const range = getRangeFromDates(
        customRange?.[0]?.toDate() ?? null,
        customRange?.[1]?.toDate() ?? null
      );
      return range;
    }
    return null;
  };

  const calculateStats = () => {
    const getReceivedAmount = (b: Booking) => {
      const online = b.amountReceivedOnline ?? 0;
      const cash = b.amountReceivedCash ?? 0;
      return online + cash > 0 ? online + cash : (b.amountPaid ?? 0);
    };

    const activeRange = getActiveDateRange();
    const inActiveRange = (b: Booking) =>
      !activeRange || isDateInRange(b.date, activeRange);

    const revenueBookings = bookings.filter(
      (b) =>
        (b.status === "completed" || b.status === "confirmed") &&
        inActiveRange(b)
    );
    const totalRevenue = revenueBookings.reduce(
      (sum, b) => sum + getReceivedAmount(b),
      0
    );
    const totalCashReceived = revenueBookings.reduce(
      (sum, b) => sum + (b.amountReceivedCash ?? 0),
      0
    );
    const totalOnlineReceived = revenueBookings.reduce(
      (sum, b) => sum + (b.amountReceivedOnline ?? 0),
      0
    );
    const confirmedBookings = bookings.filter(
      (b) => b.status === "confirmed" && inActiveRange(b)
    );

    const todayRange = getTodayRange(new Date());
    const todayBookings = bookings.filter((b) =>
      isDateInRange(b.date, todayRange)
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
      if (!inActiveRange(booking)) return;
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
      confirmed: bookings.filter(
        (b) => b.status === "confirmed" && inActiveRange(b)
      ).length,
      cancelled: bookings.filter(
        (b) => b.status === "cancelled" && inActiveRange(b)
      ).length,
      completed: bookings.filter(
        (b) => b.status === "completed" && inActiveRange(b)
      ).length,
    };

    const avgBookingValue =
      revenueBookings.length > 0 ? totalRevenue / revenueBookings.length : 0;

    const courtTypeCounts: { [key: string]: number } = {};
    bookings.forEach((booking) => {
      if (!inActiveRange(booking)) return;
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

    const monthRange = getCurrentMonthRange(new Date());
    const thisMonthRevenue = bookings
      .filter(
        (b) =>
          (b.status === "completed" || b.status === "confirmed") &&
          isDateInRange(b.date, monthRange)
      )
      .reduce((sum, b) => sum + getReceivedAmount(b), 0);

    return {
      totalRevenue,
      totalCashReceived,
      totalOnlineReceived,
      confirmedBookings: confirmedBookings.length,
      todayBookings: todayBookings.length,
      totalBookings: bookings.filter(inActiveRange).length,
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
  const activeRange = getActiveDateRange();

  const handleTimeFilterChange = (id: TimeFilter) => {
    if (id === "range") {
      setCustomRange(null);
      setTimeFilter("range");
      setShowRangeModal(true);
    } else {
      setTimeFilter(id);
      setShowRangeModal(false);
    }
  };

  const kpiValueStyle = { color: "#2DD4BF", fontSize: 28 };

  return (
    <AdminLayout
      title="Analytics Dashboard"
      description="Super Admin exclusive insights"
      onRefresh={loadData}
      isLoading={isLoading}
    >
      <div className="mb-4 space-y-3">
        <Flex
          wrap="wrap"
          gap="middle"
          align="center"
          justify="space-between"
        >
          <Segmented
            options={TIME_FILTER_OPTIONS}
            value={timeFilter}
            onChange={(value) => handleTimeFilterChange(value as TimeFilter)}
          />

          <Space wrap>
            {timeFilter === "range" && (
              <Button
                icon={<CalendarOutlined />}
                onClick={() => setShowRangeModal(true)}
              >
                {customRange?.[0] && customRange?.[1]
                  ? `${customRange[0].format("MMM D, YYYY")} - ${customRange[1].format("MMM D, YYYY")}`
                  : "Select date range"}
              </Button>
            )}
            {(timeFilter !== "all" || activeRange) && (
              <Button
                type="text"
                onClick={() => {
                  setTimeFilter("all");
                  setCustomRange(null);
                  setShowRangeModal(false);
                }}
              >
                Clear
              </Button>
            )}
          </Space>
        </Flex>

        {timeFilter === "all" && (
          <Text type="secondary">Showing all time</Text>
        )}
        {timeFilter !== "all" && activeRange && (
          <Text type="secondary">
            Showing {activeRange.from} to {activeRange.to}
          </Text>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-6">
        <Card>
          <Flex justify="space-between" align="start">
            <Statistic
              title="Total Revenue"
              value={stats.totalRevenue}
              formatter={(value) => formatPkr(Number(value))}
              valueStyle={kpiValueStyle}
            />
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#2DD4BF]/20">
              <DollarOutlined className="text-2xl text-[#2DD4BF]" />
            </div>
          </Flex>
          <Text type="secondary" className="text-xs">
            {stats.bookingsByStatus.completed} completed ·{" "}
            {stats.bookingsByStatus.confirmed} confirmed
          </Text>
        </Card>

        <Card>
          <Flex justify="space-between" align="start">
            <Statistic
              title="Cash Received"
              value={stats.totalCashReceived}
              formatter={(value) => formatPkr(Number(value))}
              valueStyle={kpiValueStyle}
            />
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#2DD4BF]/20">
              <BankOutlined className="text-2xl text-[#2DD4BF]" />
            </div>
          </Flex>
          <Text type="secondary" className="text-xs">
            {stats.bookingsByStatus.completed} completed ·{" "}
            {stats.bookingsByStatus.confirmed} confirmed
          </Text>
        </Card>

        <Card>
          <Flex justify="space-between" align="start">
            <Statistic
              title="Online Received"
              value={stats.totalOnlineReceived}
              formatter={(value) => formatPkr(Number(value))}
              valueStyle={kpiValueStyle}
            />
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#2DD4BF]/20">
              <CreditCardOutlined className="text-2xl text-[#2DD4BF]" />
            </div>
          </Flex>
          <Text type="secondary" className="text-xs">
            {stats.bookingsByStatus.completed} completed ·{" "}
            {stats.bookingsByStatus.confirmed} confirmed
          </Text>
        </Card>

        <Card>
          <Flex justify="space-between" align="start">
            <Statistic
              title="Total Bookings"
              value={stats.totalBookings}
              valueStyle={kpiValueStyle}
            />
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#2DD4BF]/20">
              <RiseOutlined className="text-2xl text-[#2DD4BF]" />
            </div>
          </Flex>
          <Text type="secondary" className="text-xs">
            {stats.todayBookings} today
          </Text>
        </Card>

        <Card>
          <Flex justify="space-between" align="start">
            <Statistic
              title="Active Courts"
              value={stats.activeCourts}
              valueStyle={kpiValueStyle}
            />
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#2DD4BF]/20">
              <TeamOutlined className="text-2xl text-[#2DD4BF]" />
            </div>
          </Flex>
          <Text type="secondary" className="text-xs">
            {stats.totalCourts} total
          </Text>
        </Card>

        <Card>
          <Flex justify="space-between" align="start">
            <Statistic
              title="Avg Booking Value"
              value={stats.avgBookingValue}
              formatter={(value) => formatPkr(Number(value))}
              valueStyle={kpiValueStyle}
            />
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#2DD4BF]/20">
              <DollarOutlined className="text-2xl text-[#2DD4BF]" />
            </div>
          </Flex>
          <Text type="secondary" className="text-xs">
            Per booking
          </Text>
        </Card>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-6">
        <Card>
          <Statistic
            title="This Month Revenue"
            value={stats.thisMonthRevenue}
            formatter={(value) => formatPkr(Number(value))}
            valueStyle={{ ...kpiValueStyle, fontSize: 24 }}
          />
        </Card>

        <Card>
          <Statistic
            title="Most Popular Court"
            value={stats.mostPopularCourtType}
            valueStyle={{ ...kpiValueStyle, fontSize: 24 }}
          />
        </Card>

        <Card title="Bookings by Status">
          <div className="space-y-3">
            <Flex justify="space-between" align="center">
              <Space>
                <span className="inline-block h-3 w-3 rounded-full bg-[#2DD4BF]" />
                <Text>Confirmed</Text>
              </Space>
              <Text strong>{stats.bookingsByStatus.confirmed}</Text>
            </Flex>
            <Flex justify="space-between" align="center">
              <Space>
                <span className="inline-block h-3 w-3 rounded-full bg-zinc-500" />
                <Text>Cancelled</Text>
              </Space>
              <Text strong>{stats.bookingsByStatus.cancelled}</Text>
            </Flex>
            <Flex justify="space-between" align="center">
              <Space>
                <span className="inline-block h-3 w-3 rounded-full bg-zinc-400" />
                <Text>Completed</Text>
              </Space>
              <Text strong>{stats.bookingsByStatus.completed}</Text>
            </Flex>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card
          title={
            <Space>
              <UserOutlined className="text-[#2DD4BF]" />
              Top Users
            </Space>
          }
        >
          <div className="space-y-3">
            {stats.topUsers.length === 0 ? (
              <Text type="secondary">No bookings yet</Text>
            ) : (
              stats.topUsers.map((user, index) => (
                <Flex
                  key={user.email}
                  justify="space-between"
                  align="center"
                  className="rounded-lg bg-zinc-900/50 p-3"
                >
                  <Space>
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2DD4BF]/20 text-sm font-bold text-[#2DD4BF]">
                      {index + 1}
                    </div>
                    <div>
                      <div className="text-sm font-medium">{user.name}</div>
                      <Text type="secondary" className="text-xs">
                        {user.email}
                      </Text>
                    </div>
                  </Space>
                  <div className="text-right">
                    <div className="text-sm font-semibold">
                      {user.count} bookings
                    </div>
                    <Text className="text-xs text-[#2DD4BF]">
                      PKR {user.revenue.toFixed(2)}
                    </Text>
                  </div>
                </Flex>
              ))
            )}
          </div>
        </Card>

        <Card title="Revenue by Court Type">
          <div className="space-y-3">
            {Object.entries(stats.revenueByType).map(([type, revenue]) => (
              <Flex key={type} justify="space-between" align="center">
                <Tag>{type}</Tag>
                <Text strong className="text-[#2DD4BF]">
                  {formatPkr(revenue)}
                </Text>
              </Flex>
            ))}
          </div>
        </Card>
      </div>

      <Modal
        title="Select custom date range"
        open={showRangeModal}
        onCancel={() => setShowRangeModal(false)}
        footer={
          <Button onClick={() => setShowRangeModal(false)}>Close</Button>
        }
      >
        <Text type="secondary">
          Choose a start and end date to filter analytics.
        </Text>
        <DatePicker.RangePicker
          value={customRange}
          onChange={(dates) => setCustomRange(dates)}
          className="mt-4 w-full"
        />
      </Modal>
    </AdminLayout>
  );
}
