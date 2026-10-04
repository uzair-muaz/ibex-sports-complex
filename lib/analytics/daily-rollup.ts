import connectDB from "@/lib/mongodb";
import Booking from "@/models/Booking";
import Court from "@/models/Court";
import AnalyticsDaily, {
  type AnalyticsCourtTypeBucket,
  type AnalyticsDailyUserStat,
} from "@/models/AnalyticsDaily";
import type { AnalyticsStats, AnalyticsTopUser } from "@/components/admin/analytics/analyticsHelpers";
import {
  getCurrentMonthRange,
  getTodayRange,
} from "@/lib/date-range-utils";
import { ANALYTICS_ROLLUP_MAX_AGE_MS } from "@/lib/analytics/freshness";

export { ANALYTICS_ROLLUP_MAX_AGE_MS } from "@/lib/analytics/freshness";

type LeanBooking = {
  date: string;
  status: string;
  userEmail?: string;
  userName?: string;
  amountReceivedOnline?: number;
  amountReceivedCash?: number;
  amountPaid?: number;
  courtId?: { type?: string } | string | null;
};

function receivedAmount(b: LeanBooking): number {
  const online = b.amountReceivedOnline ?? 0;
  const cash = b.amountReceivedCash ?? 0;
  return online + cash > 0 ? online + cash : (b.amountPaid ?? 0);
}

function courtTypeOf(b: LeanBooking): string {
  if (b.courtId && typeof b.courtId === "object" && "type" in b.courtId) {
    return b.courtId.type || "UNKNOWN";
  }
  return "UNKNOWN";
}

function emptyBucket(): AnalyticsCourtTypeBucket {
  return { count: 0, revenue: 0 };
}

/** Hobby cannot run Vercel Cron hourly — freshness is enforced on analytics reads. */

function recentDateKeys(lookbackDays: number): string[] {
  const n = Math.max(0, Math.min(14, lookbackDays));
  const dates: string[] = [];
  const now = new Date();
  for (let i = 0; i <= n; i++) {
    const d = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i),
    );
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

/**
 * Rebuild today/yesterday (etc.) when rollups are missing or older than maxAgeMs.
 * Free hourly freshness without a paid/hourly Vercel Cron.
 */
export async function ensureRecentAnalyticsFresh(options?: {
  maxAgeMs?: number;
  lookbackDays?: number;
}): Promise<{
  refreshed: boolean;
  dates: string[];
  lastRebuiltAt: string;
  nextRefreshAt: string;
  maxAgeMs: number;
}> {
  await connectDB();
  const maxAgeMs = options?.maxAgeMs ?? ANALYTICS_ROLLUP_MAX_AGE_MS;
  const lookbackDays = options?.lookbackDays ?? 1; // today + yesterday
  const dates = recentDateKeys(lookbackDays);
  const cutoff = Date.now() - maxAgeMs;

  const existing = await AnalyticsDaily.find({ date: { $in: dates } })
    .select("date rebuiltAt")
    .lean();
  const byDate = new Map(
    existing.map((d) => [d.date, d.rebuiltAt ? new Date(d.rebuiltAt).getTime() : 0]),
  );

  const stale = dates.filter((date) => {
    const rebuiltAt = byDate.get(date);
    return rebuiltAt == null || rebuiltAt < cutoff;
  });

  let lastMs = 0;
  for (const t of byDate.values()) {
    if (t > lastMs) lastMs = t;
  }

  if (stale.length > 0) {
    await rebuildAnalyticsDaily(stale);
    lastMs = Date.now();
  } else if (lastMs === 0) {
    lastMs = Date.now();
  }

  return {
    refreshed: stale.length > 0,
    dates: stale,
    lastRebuiltAt: new Date(lastMs).toISOString(),
    nextRefreshAt: new Date(lastMs + maxAgeMs).toISOString(),
    maxAgeMs,
  };
}

/**
 * Rebuild AnalyticsDaily for one or more business dates (idempotent upsert).
 * Pass no dates to rebuild every distinct booking date.
 */
export async function rebuildAnalyticsDaily(dates?: string[]): Promise<{
  dates: string[];
  upserted: number;
}> {
  await connectDB();

  let targetDates = dates?.filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)) ?? [];

  if (targetDates.length === 0) {
    const distinct = await Booking.distinct("date");
    targetDates = (distinct as string[]).sort();
  }

  let upserted = 0;

  for (const date of targetDates) {
    const bookings = (await Booking.find({ date })
      .select(
        "date status userEmail userName amountReceivedOnline amountReceivedCash amountPaid courtId",
      )
      .populate("courtId", "type")
      .lean()) as LeanBooking[];

    const byCourtType = new Map<string, AnalyticsCourtTypeBucket>();
    const userMap = new Map<string, AnalyticsDailyUserStat>();

    let confirmed = 0;
    let cancelled = 0;
    let completed = 0;
    let pendingPayment = 0;
    let revenueCash = 0;
    let revenueOnline = 0;
    let revenueTotal = 0;
    let revenueBookingsCount = 0;

    for (const b of bookings) {
      if (b.status === "confirmed") confirmed++;
      else if (b.status === "cancelled") cancelled++;
      else if (b.status === "completed") completed++;
      else if (b.status === "pending_payment") pendingPayment++;

      const type = courtTypeOf(b);
      const bucket = byCourtType.get(type) ?? emptyBucket();
      bucket.count += 1;
      byCourtType.set(type, bucket);

      const isRevenue =
        b.status === "confirmed" || b.status === "completed";
      if (isRevenue) {
        const cash = b.amountReceivedCash ?? 0;
        const online = b.amountReceivedOnline ?? 0;
        const total = receivedAmount(b);
        revenueCash += cash;
        revenueOnline += online;
        revenueTotal += total;
        revenueBookingsCount += 1;
        const revBucket = byCourtType.get(type)!;
        revBucket.revenue += total;
      }

      if (b.status === "completed" && b.userEmail) {
        const key = b.userEmail.toLowerCase();
        const prev = userMap.get(key) ?? {
          email: b.userEmail,
          name: b.userName || b.userEmail,
          count: 0,
          revenue: 0,
        };
        prev.count += 1;
        prev.revenue += receivedAmount(b);
        if (b.userName) prev.name = b.userName;
        userMap.set(key, prev);
      }
    }

    const byCourtTypeObj: Record<string, AnalyticsCourtTypeBucket> = {};
    for (const [k, v] of byCourtType) {
      byCourtTypeObj[k] = v;
    }

    await AnalyticsDaily.findOneAndUpdate(
      { date },
      {
        $set: {
          date,
          totalBookings: bookings.length,
          confirmed,
          cancelled,
          completed,
          pendingPayment,
          revenueCash,
          revenueOnline,
          revenueTotal,
          revenueBookingsCount,
          byCourtType: byCourtTypeObj,
          userStats: [...userMap.values()],
          rebuiltAt: new Date(),
        },
      },
      { upsert: true, new: true },
    );
    upserted += 1;
  }

  return { dates: targetDates, upserted };
}

function mapToRecord(
  value:
    | Map<string, AnalyticsCourtTypeBucket>
    | Record<string, AnalyticsCourtTypeBucket>
    | undefined,
): Record<string, AnalyticsCourtTypeBucket> {
  if (!value) return {};
  if (value instanceof Map) {
    return Object.fromEntries(value.entries());
  }
  return value;
}

/** Aggregate AnalyticsDaily rows into dashboard AnalyticsStats. */
export async function summarizeAnalyticsFromDaily(input: {
  dateFrom?: string | null;
  dateTo?: string | null;
}): Promise<AnalyticsStats> {
  await connectDB();

  const query: Record<string, unknown> = {};
  if (input.dateFrom && input.dateTo) {
    query.date = { $gte: input.dateFrom, $lte: input.dateTo };
  }

  const [days, courts] = await Promise.all([
    AnalyticsDaily.find(query).sort({ date: 1 }).lean(),
    Court.find().select("isActive type").lean(),
  ]);

  let totalRevenue = 0;
  let totalCashReceived = 0;
  let totalOnlineReceived = 0;
  let confirmedBookings = 0;
  let totalBookings = 0;
  let revenueBookingsCount = 0;
  const bookingsByStatus = { confirmed: 0, cancelled: 0, completed: 0 };
  const revenueByType: Record<string, number> = {};
  const courtTypeCounts: Record<string, number> = {};
  const userMap = new Map<string, AnalyticsTopUser>();

  for (const day of days) {
    totalRevenue += day.revenueTotal || 0;
    totalCashReceived += day.revenueCash || 0;
    totalOnlineReceived += day.revenueOnline || 0;
    confirmedBookings += day.confirmed || 0;
    totalBookings += day.totalBookings || 0;
    revenueBookingsCount += day.revenueBookingsCount || 0;
    bookingsByStatus.confirmed += day.confirmed || 0;
    bookingsByStatus.cancelled += day.cancelled || 0;
    bookingsByStatus.completed += day.completed || 0;

    const byType = mapToRecord(
      day.byCourtType as
        | Map<string, AnalyticsCourtTypeBucket>
        | Record<string, AnalyticsCourtTypeBucket>,
    );
    for (const [type, bucket] of Object.entries(byType)) {
      revenueByType[type] = (revenueByType[type] || 0) + (bucket.revenue || 0);
      courtTypeCounts[type] = (courtTypeCounts[type] || 0) + (bucket.count || 0);
    }

    for (const u of day.userStats || []) {
      const key = u.email.toLowerCase();
      const prev = userMap.get(key) ?? {
        email: u.email,
        name: u.name,
        count: 0,
        revenue: 0,
      };
      prev.count += u.count;
      prev.revenue += u.revenue;
      prev.name = u.name || prev.name;
      userMap.set(key, prev);
    }
  }

  const todayKey = getTodayRange(new Date()).from;
  const monthRange = getCurrentMonthRange(new Date());

  const [todayDoc, monthDays] = await Promise.all([
    AnalyticsDaily.findOne({ date: todayKey }).lean(),
    AnalyticsDaily.find({
      date: { $gte: monthRange.from, $lte: monthRange.to },
    })
      .select("revenueTotal")
      .lean(),
  ]);

  const todayBookings = todayDoc?.totalBookings ?? 0;
  const thisMonthRevenue = monthDays.reduce(
    (sum, d) => sum + (d.revenueTotal || 0),
    0,
  );

  const topUsers = [...userMap.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const mostPopularCourtType =
    Object.entries(courtTypeCounts).sort(([, a], [, b]) => b - a)[0]?.[0] ||
    "N/A";

  const avgBookingValue =
    revenueBookingsCount > 0 ? totalRevenue / revenueBookingsCount : 0;

  return {
    totalRevenue,
    totalCashReceived,
    totalOnlineReceived,
    confirmedBookings,
    todayBookings,
    totalBookings,
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
