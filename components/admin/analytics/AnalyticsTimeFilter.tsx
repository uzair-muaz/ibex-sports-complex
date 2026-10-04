"use client";

import React from "react";
import { Button, DatePicker, Flex, Modal, Segmented, Space, Typography } from "antd";
import { CalendarOutlined } from "@ant-design/icons";
import type { Dayjs } from "dayjs";
import {
  TIME_FILTER_OPTIONS,
  type DateRange,
  type TimeFilter,
} from "./analyticsHelpers";

const { Text } = Typography;

type AnalyticsTimeFilterProps = {
  timeFilter: TimeFilter;
  customRange: [Dayjs | null, Dayjs | null] | null;
  activeRange: DateRange | null;
  showRangeModal: boolean;
  onTimeFilterChange: (id: TimeFilter) => void;
  onCustomRangeChange: (dates: [Dayjs | null, Dayjs | null] | null) => void;
  onOpenRangeModal: () => void;
  onCloseRangeModal: () => void;
  onClear: () => void;
};

export function AnalyticsTimeFilter({
  timeFilter,
  customRange,
  activeRange,
  showRangeModal,
  onTimeFilterChange,
  onCustomRangeChange,
  onOpenRangeModal,
  onCloseRangeModal,
  onClear,
}: AnalyticsTimeFilterProps) {
  return (
    <>
      <div className="mb-4 space-y-3">
        <Flex wrap="wrap" gap="middle" align="center" justify="space-between">
          <Segmented
            options={TIME_FILTER_OPTIONS}
            value={timeFilter}
            onChange={(value) => onTimeFilterChange(value as TimeFilter)}
          />

          <Space wrap>
            {timeFilter === "range" && (
              <Button icon={<CalendarOutlined />} onClick={onOpenRangeModal}>
                {customRange?.[0] && customRange?.[1]
                  ? `${customRange[0].format("MMM D, YYYY")} - ${customRange[1].format("MMM D, YYYY")}`
                  : "Select date range"}
              </Button>
            )}
            {(timeFilter !== "all" || activeRange) && (
              <Button type="text" onClick={onClear}>
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

      <Modal
        title="Select custom date range"
        open={showRangeModal}
        onCancel={onCloseRangeModal}
        footer={<Button onClick={onCloseRangeModal}>Close</Button>}
      >
        <Text type="secondary">
          Choose a start and end date to filter analytics.
        </Text>
        <DatePicker.RangePicker
          value={customRange}
          onChange={(dates) => onCustomRangeChange(dates)}
          className="mt-4 w-full"
        />
      </Modal>
    </>
  );
}
