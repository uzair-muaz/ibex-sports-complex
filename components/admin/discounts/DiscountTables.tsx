"use client";

import React, { useMemo } from "react";
import { Button, Card, Space, Switch, Table, Typography } from "antd";
import type { ColumnsType, TableProps } from "antd/es/table";
import {
  EditOutlined,
  DeleteOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import {
  formatCourtTypes,
  formatBookingDurationRange,
  formatPricingTierLabel,
  formatDiscountValueSummary,
  formatTimeRestriction,
  usesTierSplitDiscount,
} from "@/lib/discount-utils";
import type { Discount } from "@/types";
import { DiscountStatusTag, DiscountTypeTag } from "./DiscountStatusTag";

const { Text } = Typography;

type DiscountTablesProps = {
  flatDiscounts: Discount[];
  timeBasedDiscounts: Discount[];
  sortColumn: keyof Discount | null;
  sortDirection: "asc" | "desc";
  togglingDiscountId: string | null;
  onTableChange: TableProps<Discount>["onChange"];
  onEdit: (discount: Discount) => void;
  onDelete: (discount: Discount) => void;
  onToggleActive: (discount: Discount) => void;
};

export function DiscountTables({
  flatDiscounts,
  timeBasedDiscounts,
  sortColumn,
  sortDirection,
  togglingDiscountId,
  onTableChange,
  onEdit,
  onDelete,
  onToggleActive,
}: DiscountTablesProps) {
  const sortOrderFor = (column: keyof Discount) =>
    sortColumn === column
      ? sortDirection === "asc"
        ? "ascend"
        : "descend"
      : null;

  const renderActions = (discount: Discount) => (
    <Space size="small">
      <Switch
        size="small"
        checked={discount.isActive}
        loading={togglingDiscountId === discount._id}
        onChange={() => onToggleActive(discount)}
      />
      <Button
        type="text"
        icon={<EditOutlined />}
        onClick={() => onEdit(discount)}
        title="Edit"
      />
      <Button
        type="text"
        danger
        icon={<DeleteOutlined />}
        onClick={() => onDelete(discount)}
        title="Delete"
      />
    </Space>
  );

  const flatColumns: ColumnsType<Discount> = useMemo(
    () => [
      {
        title: "Name",
        dataIndex: "name",
        key: "name",
        sorter: (a, b) => a.name.localeCompare(b.name),
        sortOrder: sortOrderFor("name"),
        render: (name: string) => (
          <span className="font-medium text-[var(--ant-color-text)] text-sm">
            {name}
          </span>
        ),
      },
      {
        title: "Type",
        dataIndex: "type",
        key: "type",
        sorter: (a, b) => a.type.localeCompare(b.type),
        sortOrder: sortOrderFor("type"),
        render: (_: unknown, discount: Discount) => (
          <DiscountTypeTag discount={discount} />
        ),
      },
      {
        title: "Value",
        dataIndex: "value",
        key: "value",
        sorter: (a, b) => a.value - b.value,
        sortOrder: sortOrderFor("value"),
        render: (_: unknown, discount: Discount) => (
          <span className="text-[#2DD4BF] font-semibold text-sm">
            {formatDiscountValueSummary(discount)}
          </span>
        ),
      },
      {
        title: "Types",
        key: "courtTypes",
        render: (_: unknown, discount: Discount) => (
          <span className="text-[var(--ant-color-text-secondary)] text-sm">
            {formatCourtTypes(discount.courtTypes)}
          </span>
        ),
      },
      {
        title: "Valid Period",
        key: "validPeriod",
        render: (_: unknown, discount: Discount) => (
          <Space size="small">
            <CalendarOutlined className="text-[var(--ant-color-text-secondary)]" />
            <Text type="secondary" className="text-sm">
              {new Date(discount.validFrom).toLocaleDateString()} -{" "}
              {new Date(discount.validUntil).toLocaleDateString()}
            </Text>
          </Space>
        ),
      },
      {
        title: "Status",
        dataIndex: "isActive",
        key: "isActive",
        sorter: (a, b) => Number(a.isActive) - Number(b.isActive),
        sortOrder: sortOrderFor("isActive"),
        render: (_: unknown, discount: Discount) => (
          <DiscountStatusTag discount={discount} />
        ),
      },
      {
        title: "Actions",
        key: "actions",
        align: "right",
        render: (_: unknown, discount: Discount) => renderActions(discount),
      },
    ],
    [sortColumn, sortDirection, togglingDiscountId],
  );

  const timeBasedColumns: ColumnsType<Discount> = useMemo(
    () => [
      {
        title: "Name",
        dataIndex: "name",
        key: "name",
        sorter: (a, b) => a.name.localeCompare(b.name),
        sortOrder: sortOrderFor("name"),
        render: (name: string) => (
          <span className="font-medium text-[var(--ant-color-text)] text-sm">
            {name}
          </span>
        ),
      },
      {
        title: "Type",
        dataIndex: "type",
        key: "type",
        sorter: (a, b) => a.type.localeCompare(b.type),
        sortOrder: sortOrderFor("type"),
        render: (_: unknown, discount: Discount) => (
          <DiscountTypeTag discount={discount} />
        ),
      },
      {
        title: "Value",
        dataIndex: "value",
        key: "value",
        sorter: (a, b) => a.value - b.value,
        sortOrder: sortOrderFor("value"),
        render: (_: unknown, discount: Discount) => (
          <span className="text-[#2DD4BF] font-semibold text-sm">
            {formatDiscountValueSummary(discount)}
          </span>
        ),
      },
      {
        title: "Types",
        key: "courtTypes",
        render: (_: unknown, discount: Discount) => (
          <span className="text-[var(--ant-color-text-secondary)] text-sm">
            {formatCourtTypes(discount.courtTypes)}
          </span>
        ),
      },
      {
        title: "Length",
        key: "length",
        render: (_: unknown, discount: Discount) => (
          <span className="text-[var(--ant-color-text-secondary)] text-sm whitespace-nowrap">
            {formatBookingDurationRange(
              discount.minBookingHours,
              discount.maxBookingHours,
            )}
          </span>
        ),
      },
      {
        title: "Tier",
        key: "tier",
        render: (_: unknown, discount: Discount) => (
          <span className="text-[var(--ant-color-text-secondary)] text-sm">
            {usesTierSplitDiscount(discount)
              ? "Any start (split)"
              : formatPricingTierLabel(discount.pricingTier)}
          </span>
        ),
      },
      {
        title: "Time",
        key: "time",
        render: (_: unknown, discount: Discount) => (
          <span className="text-[var(--ant-color-text-secondary)] text-sm">
            {formatTimeRestriction(
              discount.allDay,
              discount.startHour,
              discount.endHour,
            )}
          </span>
        ),
      },
      {
        title: "Valid Period",
        key: "validPeriod",
        render: (_: unknown, discount: Discount) => (
          <Space size="small">
            <CalendarOutlined className="text-[var(--ant-color-text-secondary)]" />
            <Text type="secondary" className="text-sm">
              {new Date(discount.validFrom).toLocaleDateString()} -{" "}
              {new Date(discount.validUntil).toLocaleDateString()}
            </Text>
          </Space>
        ),
      },
      {
        title: "Status",
        dataIndex: "isActive",
        key: "isActive",
        sorter: (a, b) => Number(a.isActive) - Number(b.isActive),
        sortOrder: sortOrderFor("isActive"),
        render: (_: unknown, discount: Discount) => (
          <DiscountStatusTag discount={discount} />
        ),
      },
      {
        title: "Actions",
        key: "actions",
        align: "right",
        render: (_: unknown, discount: Discount) => renderActions(discount),
      },
    ],
    [sortColumn, sortDirection, togglingDiscountId],
  );

  return (
    <div className="space-y-8">
      <Card
        className="border-[var(--ant-color-border)]"
        styles={{ body: { padding: 0 } }}
      >
        <div className="border-b border-[var(--ant-color-border)] px-4 py-3">
          <h2 className="text-sm font-semibold text-[var(--ant-color-text)]">
            Flat discounts
          </h2>
          <p className="text-xs text-[var(--ant-color-text-secondary)] mt-0.5">
            Standard promos (court types + validity). All day, any duration, any
            tier.
          </p>
        </div>
        <Table<Discount>
          rowKey="_id"
          columns={flatColumns}
          dataSource={flatDiscounts}
          onChange={onTableChange}
          pagination={false}
          scroll={{ x: "max-content" }}
          locale={{
            emptyText:
              "No flat discounts yet. Add one or create a rule-only discount below.",
          }}
        />
      </Card>

      <Card
        className="border-[var(--ant-color-border)]"
        styles={{ body: { padding: 0 } }}
      >
        <div className="border-b border-[var(--ant-color-border)] px-4 py-3">
          <h2 className="text-sm font-semibold text-[var(--ant-color-text)]">
            Time-based &amp; rules
          </h2>
          <p className="text-xs text-[var(--ant-color-text-secondary)] mt-0.5">
            Booking length, peak/off-peak, or restricted hours. Scoped by court
            type only (same as public booking).
          </p>
        </div>
        <Table<Discount>
          rowKey="_id"
          columns={timeBasedColumns}
          dataSource={timeBasedDiscounts}
          onChange={onTableChange}
          pagination={false}
          scroll={{ x: "max-content" }}
          locale={{
            emptyText:
              "No time-based discounts. Add duration, tier, or hour rules in the drawer.",
          }}
        />
      </Card>
    </div>
  );
}
