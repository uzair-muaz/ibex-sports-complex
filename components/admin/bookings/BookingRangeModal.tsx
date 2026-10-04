"use client";

import React from "react";
import { Button, DatePicker, Modal, Typography } from "antd";
import type { Dayjs } from "dayjs";

const { Text } = Typography;

type BookingRangeModalProps = {
  open: boolean;
  value: [Dayjs | null, Dayjs | null] | null;
  onChange: (dates: [Dayjs | null, Dayjs | null] | null) => void;
  onClose: () => void;
};

export function BookingRangeModal({
  open,
  value,
  onChange,
  onClose,
}: BookingRangeModalProps) {
  return (
    <Modal
      title="Select custom date range"
      open={open}
      onCancel={onClose}
      footer={<Button onClick={onClose}>Close</Button>}
    >
      <Text type="secondary">
        Choose a start and end date to filter bookings.
      </Text>
      <DatePicker.RangePicker
        value={value}
        onChange={(dates) => onChange(dates)}
        className="mt-4 w-full"
      />
    </Modal>
  );
}
