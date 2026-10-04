"use client";

import { Modal, Typography } from "antd";
import {
  formatDiscountValue,
  formatCourtTypes,
} from "@/lib/discount-utils";
import type { Discount } from "@/types";
import { DiscountStatusTag } from "./DiscountStatusTag";

const { Text } = Typography;

type DeleteDiscountModalProps = {
  open: boolean;
  discount: Discount | null;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function DeleteDiscountModal({
  open,
  discount,
  isDeleting,
  onCancel,
  onConfirm,
}: DeleteDiscountModalProps) {
  return (
    <Modal
      title="Delete Discount"
      open={open}
      onCancel={onCancel}
      onOk={onConfirm}
      okText="Yes, Delete Discount"
      okButtonProps={{ danger: true, loading: isDeleting }}
      cancelButtonProps={{ disabled: isDeleting }}
    >
      <Text type="secondary" className="mb-4 block">
        Are you sure you want to delete this discount? This action cannot be
        undone.
      </Text>
      {discount && (
        <div className="space-y-2 rounded-lg bg-[var(--ant-color-bg-elevated)] p-4">
          <div className="flex items-center justify-between">
            <Text type="secondary">Name:</Text>
            <Text className="font-medium text-[var(--ant-color-text)]">
              {discount.name}
            </Text>
          </div>
          <div className="flex items-center justify-between">
            <Text type="secondary">Value:</Text>
            <Text>
              {formatDiscountValue(discount.type, discount.value)}
            </Text>
          </div>
          <div className="flex items-center justify-between">
            <Text type="secondary">Courts:</Text>
            <Text>{formatCourtTypes(discount.courtTypes)}</Text>
          </div>
          <div className="flex items-center justify-between">
            <Text type="secondary">Status:</Text>
            <DiscountStatusTag discount={discount} />
          </div>
        </div>
      )}
    </Modal>
  );
}
