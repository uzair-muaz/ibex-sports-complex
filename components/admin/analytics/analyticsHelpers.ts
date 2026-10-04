import type { Dayjs } from "dayjs";
import type { Booking, Court } from "@/types";
import {
  getTodayRange,
  getCurrentWeekRange,
  getCurrentMonthRange,
  getCurrentYearRange,
  getRangeFromDates,
  isDateInRange,
  type DateRange,
} from "@/lib/date-range-utils";

export type { DateRange };

export type TimeFilter = "all" | "today" | "week" | "month" | "year" | "range";

export const TIME_FILTER_OPTIONS: { label: string; value: TimeFilter }[] = [
  { label: "All", value: "all" },
  { label: "Today", value: "today" },
  { label: "This Week", value: "week" },
  { label: "This Month", value: "month" },
  { label: "This Year", value: "year" },
  { label: "Custom Range", value: "range" },
];

export const formatPkr = (value: number) =>
  `PKR ${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export const KPI_VALUE_STYLE = {
  color: "var(--ant-color-primary)",
  fontSize: 28,
};

export type AnalyticsTopUser = {
  email: string;
  name: string;
  count: number;
  revenue: number;
};

export type AnalyticsStats = {
  totalRevenue: number;
  totalCashReceived: number;
  totalOnlineReceived: number;
  confirmedBookings: number;
  todayBookings: number;
  totalBookings: number;
  activeCourts: number;
  totalCourts: number;
  topUsers: AnalyticsTopUser[];
  revenueByType: { [key: string]: number };
  bookingsByStatus: {
    confirmed: number;
    cancelled: number;
    completed: number;
  };
  avgBookingValue: number;
  mostPopularCourtType: string;
  thisMonthRevenue: number;
};

export function getActiveDateRange(
  timeFilter: TimeFilter,
  customRange: [Dayjs | null, Dayjs | null] | null,
): DateRange | null {
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
    return getRangeFromDates(
      customRange?.[0]?.toDate() ?? null,
      customRange?.[1]?.toDate() ?? null,
    );
  }
  return null;
}

function getReceivedAmount(b: Booking) {
  const online = b.amountReceivedOnline ?? 0;
  const cash = b.amountReceivedCash ?? 0;
  return online + cash > 0 ? online + cash : (b.amountPaid ?? 0);
}

function getCourtType(booking: Booking): string {
  return typeof booking.courtId === "object" &&
    booking.courtId &&
    "type" in booking.courtId
    ? (booking.courtId as Court).type || "UNKNOWN"
    : "UNKNOWN";
}

export function calculateAnalyticsStats(
  bookings: Booking[],
  courts: Court[],
  activeRange: DateRange | null,
): AnalyticsStats {
  const inActiveRange = (b: Booking) =>
    !activeRange || isDateInRange(b.date, activeRange);

  const revenueBookings = bookings.filter(
    (b) =>
      (b.status === "completed" || b.status === "confirmed") &&
      inActiveRange(b),
  );
  const totalRevenue = revenueBookings.reduce(
    (sum, b) => sum + getReceivedAmount(b),
    0,
  );
  const totalCashReceived = revenueBookings.reduce(
    (sum, b) => sum + (b.amountReceivedCash ?? 0),
    0,
  );
  const totalOnlineReceived = revenueBookings.reduce(
    (sum, b) => sum + (b.amountReceivedOnline ?? 0),
    0,
  );
  const confirmedBookings = bookings.filter(
    (b) => b.status === "confirmed" && inActiveRange(b),
  );

  const todayRange = getTodayRange(new Date());
  const todayBookings = bookings.filter((b) =>
    isDateInRange(b.date, todayRange),
  );

  const userBookingCounts: {
    [key: string]: AnalyticsTopUser;
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
    const courtType = getCourtType(booking);
    revenueByType[courtType] =
      (revenueByType[courtType] || 0) + getReceivedAmount(booking);
  });

  const bookingsByStatus = {
    confirmed: bookings.filter(
      (b) => b.status === "confirmed" && inActiveRange(b),
    ).length,
    cancelled: bookings.filter(
      (b) => b.status === "cancelled" && inActiveRange(b),
    ).length,
    completed: bookings.filter(
      (b) => b.status === "completed" && inActiveRange(b),
    ).length,
  };

  const avgBookingValue =
    revenueBookings.length > 0 ? totalRevenue / revenueBookings.length : 0;

  const courtTypeCounts: { [key: string]: number } = {};
  bookings.forEach((booking) => {
    if (!inActiveRange(booking)) return;
    const courtType = getCourtType(booking);
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
        isDateInRange(b.date, monthRange),
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
}
