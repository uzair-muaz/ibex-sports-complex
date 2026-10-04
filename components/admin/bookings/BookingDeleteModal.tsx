"use client";

import React from "react";
import { Button, Modal, Tag, Typography } from "antd";
import type { Booking } from "@/types";
import { formatDisplayDate } from "@/lib/utils";
import {
  formatStatusLabel,
  getEndTimeLabel,
  getStatusTagColor,
} from "./bookingDisplay";

const { Text } = Typography;

type BookingDeleteModalProps = {
  booking: Booking | null;
  open: boolean;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function BookingDeleteModal({
  booking,
  open,
  isDeleting,
  onClose,
  onConfirm,
}: BookingDeleteModalProps) {
  return (
    <Modal
      title="Delete Booking"
      open={open}
      onCancel={() => {
        if (isDeleting) return;
        onClose();
      }}
      footer={[
        <Button key="cancel" onClick={onClose} disabled={isDeleting}>
          Cancel
        </Button>,
        <Button
          key="delete"
          type="primary"
          danger
          loading={isDeleting}
          onClick={onConfirm}
        >
          Yes, Delete Booking
        </Button>,
      ]}
    >
      <Text type="secondary">
        Are you sure you want to permanently delete this booking? This action
        cannot be undone.
      </Text>
      {booking && (
        <div className="mt-4 space-y-4">
          <div className="space-y-2 rounded-lg bg-[var(--ant-color-bg-elevated)] p-4">
            <div className="flex items-center justify-between">
              <Text type="secondary" className="text-sm">
                Booking ID:
              </Text>
              <span className="font-mono text-sm text-[var(--ant-color-text)]">
                #{booking._id.slice(-8)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <Text type="secondary" className="text-sm">
                User:
              </Text>
              <span className="text-sm text-[var(--ant-color-text)]">
                {booking.userName}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <Text type="secondary" className="text-sm">
                Email:
              </Text>
              <span className="text-sm text-[var(--ant-color-text)]">
                {booking.userEmail}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <Text type="secondary" className="text-sm">
                Date:
              </Text>
              <span className="text-sm text-[var(--ant-color-text)]">
                {formatDisplayDate(booking.date)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <Text type="secondary" className="text-sm">
                Time:
              </Text>
              <span className="text-sm text-[var(--ant-color-text)]">
                {getEndTimeLabel(booking)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <Text type="secondary" className="text-sm">
                Status:
              </Text>
              <Tag color={getStatusTagColor(booking.status)}>
                {formatStatusLabel(booking.status)}
              </Tag>
            </div>
            <div className="flex items-center justify-between">
              <Text type="secondary" className="text-sm">
                Total Price:
              </Text>
              <span className="text-sm font-semibold text-[#2DD4BF]">
                PKR {booking.totalPrice.toLocaleString()}
              </span>
            </div>
          </div>
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
            <Text type="danger" className="text-sm">
              This will permanently remove the booking from the system. This
              action cannot be undone.
            </Text>
          </div>
        </div>
      )}
    </Modal>
  );
}
