"use client";

import React from "react";
import { Card, Flex, Space, Statistic, Tag, Typography } from "antd";
import { UserOutlined } from "@ant-design/icons";
import {
  formatPkr,
  KPI_VALUE_STYLE,
  type AnalyticsStats,
} from "./analyticsHelpers";

const { Text } = Typography;

type AnalyticsChartsProps = {
  stats: AnalyticsStats;
};

export function AnalyticsCharts({ stats }: AnalyticsChartsProps) {
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-6">
        <Card>
          <Statistic
            title="This Month Revenue"
            value={stats.thisMonthRevenue}
            formatter={(value) => formatPkr(Number(value))}
            valueStyle={{ ...KPI_VALUE_STYLE, fontSize: 24 }}
          />
        </Card>

        <Card>
          <Statistic
            title="Most Popular Court"
            value={stats.mostPopularCourtType}
            valueStyle={{ ...KPI_VALUE_STYLE, fontSize: 24 }}
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
                <span className="inline-block h-3 w-3 rounded-full bg-[var(--ant-color-text-secondary)]" />
                <Text>Cancelled</Text>
              </Space>
              <Text strong>{stats.bookingsByStatus.cancelled}</Text>
            </Flex>
            <Flex justify="space-between" align="center">
              <Space>
                <span className="inline-block h-3 w-3 rounded-full bg-[var(--ant-color-text-quaternary)]" />
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
                  className="rounded-lg bg-[var(--ant-color-bg-elevated)] p-3"
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
    </>
  );
}
