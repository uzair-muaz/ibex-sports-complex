"use client";

import React from "react";
import { Button, Select, Space, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  CloseOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import type { Booking } from "@/types";
import { formatDisplayDate } from "@/lib/utils";
import {
  STATUS_OPTIONS,
  getCourtName,
  getEndTimeLabel,
  type SortColumn,
} from "./bookingDisplay";

const { Text } = Typography;

export type BookingTableColumnHandlers = {
  sortColumn: SortColumn | null;
  sortDirection: "asc" | "desc";
  updatingStatusBookingId: string | null;
  isSuperAdmin: boolean;
  onStatusChange: (bookingId: string, status: Booking["status"]) => void;
  onView: (booking: Booking) => void;
  onEdit: (booking: Booking) => void;
  onCancel: (booking: Booking) => void;
  onDelete: (booking: Booking) => void;
};

export function getBookingTableColumns(
  handlers: BookingTableColumnHandlers,
): ColumnsType<Booking> {
  const {
    sortColumn,
    sortDirection,
    updatingStatusBookingId,
    isSuperAdmin,
    onStatusChange,
    onView,
    onEdit,
    onCancel,
    onDelete,
  } = handlers;

  const getSortOrder = (column: SortColumn) => {
    if (sortColumn !== column) return null;
    return sortDirection === "asc" ? ("ascend" as const) : ("descend" as const);
  };

  return [
    {
      title: "No.",
      key: "serialNumber",
      width: 70,
      render: (_, booking) => (
        <Text type="secondary" className="font-mono text-xs">
          {typeof booking.serialNumber === "number"
            ? booking.serialNumber.toString().padStart(3, "0")
            : "—"}
        </Text>
      ),
    },
    {
      title: "User",
      key: "userName",
      minWidth: 160,
      sorter: true,
      sortOrder: getSortOrder("userName"),
      render: (_, booking) => (
        <div>
          <div className="font-medium text-[var(--ant-color-text)]">
            {booking.userName}
          </div>
          <Text
            type="secondary"
            className="block max-w-[180px] truncate text-xs"
            title={booking.userEmail}
          >
            {booking.userEmail}
          </Text>
          <Text type="secondary" className="text-xs">
            {booking.userPhone || "—"}
          </Text>
        </div>
      ),
    },
    {
      title: "Court",
      key: "courtName",
      minWidth: 100,
      sorter: true,
      sortOrder: getSortOrder("courtName"),
      render: (_, booking) => <Tag>{getCourtName(booking)}</Tag>,
    },
    {
      title: "Date & Time",
      key: "date",
      minWidth: 140,
      sorter: true,
      sortOrder: getSortOrder("date"),
      defaultSortOrder: "descend",
      render: (_, booking) => (
        <div>
          <div>{formatDisplayDate(booking.date)}</div>
          <Text type="secondary" className="text-xs">
            {getEndTimeLabel(booking)}
          </Text>
        </div>
      ),
    },
    {
      title: "Booking total",
      key: "totalPrice",
      minWidth: 100,
      sorter: true,
      sortOrder: getSortOrder("totalPrice"),
      render: (_, booking) => (
        <span className="font-semibold text-[#2DD4BF]">
          PKR {booking.totalPrice.toLocaleString()}
        </span>
      ),
    },
    {
      title: "Received & discount",
      key: "received",
      minWidth: 160,
      render: (_, booking) => {
        const online = booking.amountReceivedOnline ?? 0;
        const cash = booking.amountReceivedCash ?? 0;
        const received =
          online + cash > 0 ? online + cash : (booking.amountPaid ?? 0);
        const discount =
          booking.status === "completed" && booking.totalPrice - received > 0
            ? booking.totalPrice - received
            : 0;
        const hasBreakdown = online > 0 || cash > 0;

        return (
          <div className="space-y-1 text-xs">
            {hasBreakdown ? (
              <Text type="secondary">
                Online {online.toLocaleString()} + Cash {cash.toLocaleString()}
              </Text>
            ) : null}
            <div className="font-medium text-[var(--ant-color-text)]">
              Total {received.toLocaleString()}
            </div>
            {discount > 0 && (
              <div className="text-amber-400">
                Discount {discount.toLocaleString()}
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: "Status",
      key: "status",
      minWidth: 180,
      sorter: true,
      sortOrder: getSortOrder("status"),
      render: (_, booking) => (
        <Select
          value={booking.status}
          onChange={(value) =>
            onStatusChange(booking._id, value as Booking["status"])
          }
          disabled={updatingStatusBookingId === booking._id}
          loading={updatingStatusBookingId === booking._id}
          options={STATUS_OPTIONS}
          style={{ width: 165 }}
          popupMatchSelectWidth={false}
        />
      ),
    },
    {
      title: "Actions",
      key: "actions",
      align: "right",
      minWidth: 140,
      fixed: "right",
      render: (_, booking) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => onView(booking)}
            title="View Details"
          />
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => onEdit(booking)}
            title="Edit"
          />
          {(booking.status === "confirmed" ||
            booking.status === "pending_payment") && (
            <Button
              type="text"
              danger
              icon={<CloseOutlined />}
              onClick={() => onCancel(booking)}
              title="Cancel Booking"
            />
          )}
          {isSuperAdmin && (
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => onDelete(booking)}
              title="Delete"
            />
          )}
        </Space>
      ),
    },
  ];
}
