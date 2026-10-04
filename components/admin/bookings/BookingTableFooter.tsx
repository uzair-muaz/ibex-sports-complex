"use client";

import React from "react";
import { Pagination, Select, Space, Typography } from "antd";

const { Text } = Typography;

type BookingTableFooterProps = {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  disabled?: boolean;
  onPageChange: (page: number, pageSize: number) => void;
  onPageSizeChange: (pageSize: number) => void;
};

export function BookingTableFooter({
  page,
  pageSize,
  totalCount,
  totalPages,
  disabled,
  onPageChange,
  onPageSizeChange,
}: BookingTableFooterProps) {
  return (
    <div className="flex flex-col gap-3 border-t border-[var(--ant-color-border)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <Text type="secondary" className="text-xs">
        Page{" "}
        <span className="font-mono text-[var(--ant-color-text)]">{page}</span> of{" "}
        <span className="font-mono text-[var(--ant-color-text)]">
          {totalPages}
        </span>{" "}
        <span className="ml-2">({totalCount} total)</span>
      </Text>
      <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center">
        <Space size="small">
          <Text type="secondary" className="text-xs">
            Rows per page
          </Text>
          <Select
            value={pageSize}
            onChange={onPageSizeChange}
            options={[10, 20, 50, 100].map((n) => ({
              value: n,
              label: String(n),
            }))}
            style={{ width: 80 }}
          />
        </Space>
        <Pagination
          current={page}
          pageSize={pageSize}
          total={totalCount}
          onChange={onPageChange}
          showSizeChanger={false}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
