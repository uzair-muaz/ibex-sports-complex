"use client";

import React, { useMemo, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Alert, App } from "antd";
import type { Dayjs } from "dayjs";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminCardGridSkeleton } from "@/components/admin/loaders";
import { AnalyticsTimeFilter } from "@/components/admin/analytics/AnalyticsTimeFilter";
import { AnalyticsStatsGrid } from "@/components/admin/analytics/AnalyticsStatsGrid";
import { AnalyticsCharts } from "@/components/admin/analytics/AnalyticsCharts";
import { AnalyticsRefreshCountdown } from "@/components/admin/analytics/AnalyticsRefreshCountdown";
import {
  getActiveDateRange,
  type TimeFilter,
} from "@/components/admin/analytics/analyticsHelpers";
import {
  useAnalyticsSummary,
  getQueryLoadingState,
} from "@/lib/tanstack/hooks/queries";

export default function AnalyticsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { message } = App.useApp();
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("month");
  const [customRange, setCustomRange] = useState<
    [Dayjs | null, Dayjs | null] | null
  >(null);
  const [showRangeModal, setShowRangeModal] = useState(false);

  const userRole = (session?.user as { role?: string })?.role;
  const isSuperAdmin = userRole === "super_admin";

  const activeRange = getActiveDateRange(timeFilter, customRange);
  const analyticsInput = useMemo(
    () =>
      activeRange
        ? { dateFrom: activeRange.from, dateTo: activeRange.to }
        : { dateFrom: null, dateTo: null },
    [activeRange],
  );

  const statsQuery = useAnalyticsSummary(analyticsInput, {
    enabled: !!session && isSuperAdmin,
  });
  const statsLoading = getQueryLoadingState(statsQuery);
  const payload = statsQuery.data;
  const stats = payload?.stats;

  useEffect(() => {
    if (session && !isSuperAdmin) {
      router.push("/admin/bookings");
    }
  }, [session, isSuperAdmin, router]);

  useEffect(() => {
    if (statsQuery.error) {
      message.error(
        statsQuery.error instanceof Error
          ? statsQuery.error.message
          : "Failed to load analytics",
      );
    }
  }, [statsQuery.error, message]);

  if (!isSuperAdmin) {
    return null;
  }

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

  const handleRefresh = () => {
    void statsQuery.refetch();
  };

  return (
    <AdminLayout
      title="Analytics Dashboard"
      description="KPI summaries from daily rollups for the selected period"
      onRefresh={handleRefresh}
      isLoading={statsLoading.isRefreshing}
    >
      <Alert
        type="info"
        showIcon
        className="mb-4"
        message="Stats refresh up to hourly"
        description={
          <>
            Rollups update immediately when bookings change. Opening this page
            also rebuilds today/yesterday if that data is older than 1 hour.
            <AnalyticsRefreshCountdown
              nextRefreshAt={payload?.nextRefreshAt}
              lastRebuiltAt={payload?.lastRebuiltAt}
            />
          </>
        }
      />

      {statsLoading.isInitialLoading || !stats ? (
        <AdminCardGridSkeleton count={6} columns={3} />
      ) : (
        <>
          <AnalyticsTimeFilter
            timeFilter={timeFilter}
            customRange={customRange}
            activeRange={activeRange}
            showRangeModal={showRangeModal}
            onTimeFilterChange={handleTimeFilterChange}
            onCustomRangeChange={setCustomRange}
            onOpenRangeModal={() => setShowRangeModal(true)}
            onCloseRangeModal={() => setShowRangeModal(false)}
            onClear={() => {
              setTimeFilter("all");
              setCustomRange(null);
              setShowRangeModal(false);
            }}
          />

          <AnalyticsStatsGrid stats={stats} />
          <AnalyticsCharts stats={stats} />
        </>
      )}
    </AdminLayout>
  );
}
