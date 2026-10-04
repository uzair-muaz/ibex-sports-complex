"use client";

import React from "react";
import { Button, Drawer, Form, Space, Spin, Typography } from "antd";
import type { Discount } from "@/types";
import type { DiscountFormState } from "./discountHelpers";
import { DiscountBasicFields } from "./DiscountBasicFields";
import { DiscountDayRulesSection } from "./DiscountDayRulesSection";
import { DiscountTierFields } from "./DiscountTierFields";
import { DiscountValidityFields } from "./DiscountValidityFields";

const { Text } = Typography;

type DiscountFormDrawerProps = {
  open: boolean;
  editingDiscount: Discount | null;
  isLoadingEdit: boolean;
  isSubmitting: boolean;
  discountForm: DiscountFormState;
  setDiscountForm: React.Dispatch<React.SetStateAction<DiscountFormState>>;
  onClose: () => void;
  onSubmit: () => void;
};

export function DiscountFormDrawer({
  open,
  editingDiscount,
  isLoadingEdit,
  isSubmitting,
  discountForm,
  setDiscountForm,
  onClose,
  onSubmit,
}: DiscountFormDrawerProps) {
  const isFlatForm = discountForm.discountCategory === "flat";
  const isTimeForm = !isFlatForm;
  const isSplitForm = isTimeForm && discountForm.tierDiscountMode === "split";
  const isUniformTimeForm =
    isTimeForm && discountForm.tierDiscountMode === "uniform";

  return (
    <Drawer
      title={editingDiscount ? "Edit discount" : "Add discount"}
      open={open}
      onClose={onClose}
      width={672}
      destroyOnHidden
      footer={
        <Space className="flex justify-end">
          <Button onClick={onClose}>Cancel</Button>
          <Button type="primary" loading={isSubmitting} onClick={onSubmit}>
            {editingDiscount ? "Update Discount" : "Create Discount"}
          </Button>
        </Space>
      }
    >
      <Text type="secondary" className="mb-4 block">
        {editingDiscount
          ? "Update rules and value."
          : "Create a percentage or fixed promotion."}
      </Text>

      <Spin spinning={isLoadingEdit}>
        <Form layout="vertical" key={editingDiscount?._id ?? "new-discount"}>
          <DiscountBasicFields
            discountForm={discountForm}
            setDiscountForm={setDiscountForm}
            isFlatForm={isFlatForm}
            isTimeForm={isTimeForm}
            isUniformTimeForm={isUniformTimeForm}
          />

          {!isSplitForm && (
            <DiscountDayRulesSection
              discountForm={discountForm}
              setDiscountForm={setDiscountForm}
            />
          )}

          <DiscountTierFields
            discountForm={discountForm}
            setDiscountForm={setDiscountForm}
            isSplitForm={isSplitForm}
            isTimeForm={isTimeForm}
            isUniformTimeForm={isUniformTimeForm}
          />

          <DiscountValidityFields
            discountForm={discountForm}
            setDiscountForm={setDiscountForm}
          />
        </Form>
      </Spin>
    </Drawer>
  );
}
