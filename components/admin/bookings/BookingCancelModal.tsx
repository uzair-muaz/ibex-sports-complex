"use client";

import React from "react";
import { Button, Modal, Typography } from "antd";
import type { Booking } from "@/types";
import { formatDisplayDate } from "@/lib/utils";
import { getEndTimeLabel } from "./bookingDisplay";

const { Text } = Typography;

type BookingCancelModalProps = {
  booking: Booking | null;
  open: boolean;
  isCancelling: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function BookingCancelModal({
  booking,
  open,
  isCancelling,
  onClose,
  onConfirm,
}: BookingCancelModalProps) {
  return (
    <Modal
      title="Cancel Booking"
      open={open}
      onCancel={() => {
        if (isCancelling) return;
        onClose();
      }}
      footer={[
        <Button key="keep" onClick={onClose} disabled={isCancelling}>
          No, Keep Booking
        </Button>,
        <Button
          key="cancel"
          type="primary"
          danger
          loading={isCancelling}
          onClick={onConfirm}
        >
          Yes, Cancel Booking
        </Button>,
      ]}
    >
      <Text type="secondary">
        Are you sure you want to cancel this booking?
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
          </div>
          <Text className="text-sm">
            This action will mark the booking as cancelled. The booking will
            remain in the system but will be marked as cancelled.
          </Text>
        </div>
      )}
    </Modal>
  );
}
