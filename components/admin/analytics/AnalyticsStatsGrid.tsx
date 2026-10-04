"use client";

import React from "react";
import { Card, Flex, Statistic, Typography } from "antd";
import {
  DollarOutlined,
  TeamOutlined,
  RiseOutlined,
  CreditCardOutlined,
  BankOutlined,
} from "@ant-design/icons";
import {
  formatPkr,
  KPI_VALUE_STYLE,
  type AnalyticsStats,
} from "./analyticsHelpers";

const { Text } = Typography;

type AnalyticsStatsGridProps = {
  stats: AnalyticsStats;
};

function KpiIcon({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#2DD4BF]/20">
      {children}
    </div>
  );
}

export function AnalyticsStatsGrid({ stats }: AnalyticsStatsGridProps) {
  const statusHint = (
    <Text type="secondary" className="text-xs">
      {stats.bookingsByStatus.completed} completed ·{" "}
      {stats.bookingsByStatus.confirmed} confirmed
    </Text>
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-6">
      <Card>
        <Flex justify="space-between" align="start">
          <Statistic
            title="Total Revenue"
            value={stats.totalRevenue}
            formatter={(value) => formatPkr(Number(value))}
            valueStyle={KPI_VALUE_STYLE}
          />
          <KpiIcon>
            <DollarOutlined className="text-2xl text-[#2DD4BF]" />
          </KpiIcon>
        </Flex>
        {statusHint}
      </Card>

      <Card>
        <Flex justify="space-between" align="start">
          <Statistic
            title="Cash Received"
            value={stats.totalCashReceived}
            formatter={(value) => formatPkr(Number(value))}
            valueStyle={KPI_VALUE_STYLE}
          />
          <KpiIcon>
            <BankOutlined className="text-2xl text-[#2DD4BF]" />
          </KpiIcon>
        </Flex>
        {statusHint}
      </Card>

      <Card>
        <Flex justify="space-between" align="start">
          <Statistic
            title="Online Received"
            value={stats.totalOnlineReceived}
            formatter={(value) => formatPkr(Number(value))}
            valueStyle={KPI_VALUE_STYLE}
          />
          <KpiIcon>
            <CreditCardOutlined className="text-2xl text-[#2DD4BF]" />
          </KpiIcon>
        </Flex>
        {statusHint}
      </Card>

      <Card>
        <Flex justify="space-between" align="start">
          <Statistic
            title="Total Bookings"
            value={stats.totalBookings}
            valueStyle={KPI_VALUE_STYLE}
          />
          <KpiIcon>
            <RiseOutlined className="text-2xl text-[#2DD4BF]" />
          </KpiIcon>
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
            valueStyle={KPI_VALUE_STYLE}
          />
          <KpiIcon>
            <TeamOutlined className="text-2xl text-[#2DD4BF]" />
          </KpiIcon>
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
            valueStyle={KPI_VALUE_STYLE}
          />
          <KpiIcon>
            <DollarOutlined className="text-2xl text-[#2DD4BF]" />
          </KpiIcon>
        </Flex>
        <Text type="secondary" className="text-xs">
          Per booking
        </Text>
      </Card>
    </div>
  );
}
