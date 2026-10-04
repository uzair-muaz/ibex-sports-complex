"use client";

import React from "react";
import { Button, Input, Segmented, Space, Typography } from "antd";
import { CalendarOutlined, CloseOutlined } from "@ant-design/icons";
import type { Dayjs } from "dayjs";
import {
  DATE_FILTER_OPTIONS,
  type DateFilter,
} from "./bookingDisplay";

const { Text } = Typography;

type ActiveRange = { from: string; to: string } | null;

type BookingFiltersBarProps = {
  filter: string;
  onFilterChange: (value: string) => void;
  dateFilter: DateFilter;
  onDateFilterChange: (value: DateFilter) => void;
  customRange: [Dayjs | null, Dayjs | null] | null;
  activeRange: ActiveRange;
  onOpenRangeModal: () => void;
  onClearDateFilter: () => void;
};

export function BookingFiltersBar({
  filter,
  onFilterChange,
  dateFilter,
  onDateFilterChange,
  customRange,
  activeRange,
  onOpenRangeModal,
  onClearDateFilter,
}: BookingFiltersBarProps) {
  return (
    <>
      <div className="flex flex-col items-stretch gap-3 lg:flex-row lg:items-center lg:gap-4">
        <Input.Search
          placeholder="Search by name, email or booking ID..."
          value={filter}
          onChange={(e) => onFilterChange(e.target.value)}
          allowClear
          className="w-full flex-1"
        />
        <Space wrap>
          <Segmented
            options={DATE_FILTER_OPTIONS}
            value={dateFilter}
            onChange={(value) => onDateFilterChange(value as DateFilter)}
          />
          {dateFilter === "range" && (
            <Button icon={<CalendarOutlined />} onClick={onOpenRangeModal}>
              {customRange?.[0] && customRange?.[1]
                ? `${customRange[0].format("MMM D, YYYY")} - ${customRange[1].format("MMM D, YYYY")}`
                : "Select date range"}
            </Button>
          )}
          {(dateFilter !== "all" || activeRange) && (
            <Button
              type="text"
              icon={<CloseOutlined />}
              onClick={onClearDateFilter}
              title="Clear date filter"
            />
          )}
        </Space>
      </div>

      {activeRange && (
        <Text type="secondary" className="text-xs">
          Showing bookings from{" "}
          <span className="font-mono">{activeRange.from}</span> to{" "}
          <span className="font-mono">{activeRange.to}</span>
        </Text>
      )}
    </>
  );
}
