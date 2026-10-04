"use client";

import { Modal, Tag, Typography } from "antd";
import type { Court } from "@/types";

const { Text } = Typography;

type DeleteCourtModalProps = {
  open: boolean;
  court: Court | null;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function DeleteCourtModal({
  open,
  court,
  isDeleting,
  onCancel,
  onConfirm,
}: DeleteCourtModalProps) {
  return (
    <Modal
      title="Delete Court"
      open={open}
      onCancel={onCancel}
      onOk={onConfirm}
      okText="Yes, Delete Court"
      okButtonProps={{ danger: true, loading: isDeleting }}
      cancelButtonProps={{ disabled: isDeleting }}
    >
      <Text type="secondary" className="mb-4 block">
        Are you sure you want to delete this court? This action cannot be
        undone.
      </Text>
      {court && (
        <div className="space-y-4">
          <div className="space-y-2 rounded-lg bg-[var(--ant-color-bg-elevated)] p-4">
            <div className="flex items-center justify-between">
              <Text type="secondary">Court Name:</Text>
              <Text className="font-medium text-[var(--ant-color-text)]">
                {court.name}
              </Text>
            </div>
            <div className="flex items-center justify-between">
              <Text type="secondary">Type:</Text>
              <Text>{court.type}</Text>
            </div>
            <div className="flex items-center justify-between">
              <Text type="secondary">Price/Hour:</Text>
              <Text>PKR {court.pricePerHour.toLocaleString()}</Text>
            </div>
            <div className="flex items-center justify-between">
              <Text type="secondary">Status:</Text>
              <Tag color={court.isActive ? "cyan" : "error"}>
                {court.isActive ? "Active" : "Inactive"}
              </Tag>
            </div>
          </div>
          <Text className="text-[var(--ant-color-text-secondary)]">
            This action will permanently delete the court from the system. All
            associated data will be lost and this cannot be undone.
          </Text>
        </div>
      )}
    </Modal>
  );
}
