"use client";

import React from "react";
import { Form, Input, InputNumber, Select } from "antd";
import type { DiscountCategory, TierDiscountMode } from "@/types";
import type { DiscountFormState } from "./discountHelpers";

type DiscountBasicFieldsProps = {
  discountForm: DiscountFormState;
  setDiscountForm: React.Dispatch<React.SetStateAction<DiscountFormState>>;
  isFlatForm: boolean;
  isTimeForm: boolean;
  isUniformTimeForm: boolean;
};

export function DiscountBasicFields({
  discountForm,
  setDiscountForm,
  isFlatForm,
  isTimeForm,
  isUniformTimeForm,
}: DiscountBasicFieldsProps) {
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Form.Item label="Discount Name" required>
          <Input
            value={discountForm.name}
            onChange={(e) =>
              setDiscountForm({ ...discountForm, name: e.target.value })
            }
            placeholder="Weekend Special"
          />
        </Form.Item>
        <Form.Item label="Promotion kind">
          <Select
            value={discountForm.discountCategory}
            onChange={(v) => {
              const cat = v as DiscountCategory;
              setDiscountForm((prev) => ({
                ...prev,
                discountCategory: cat,
                ...(cat === "flat"
                  ? {
                      allDay: true,
                      tierDiscountMode: "uniform",
                      minBookingHours: "",
                      pricingTier: "any",
                    }
                  : {}),
              }));
            }}
            options={[
              { value: "flat", label: "Flat discount" },
              { value: "time_based", label: "Time-based discount" },
            ]}
          />
        </Form.Item>
      </div>

      {isTimeForm && (
        <Form.Item
          label="Time-based style"
          extra="Split applies different discounts to peak vs off-peak portions of the booking price."
        >
          <Select
            value={discountForm.tierDiscountMode}
            onChange={(v) =>
              setDiscountForm({
                ...discountForm,
                tierDiscountMode: v as TierDiscountMode,
              })
            }
            options={[
              {
                value: "uniform",
                label: "Single rate (optional peak/off-peak start filter)",
              },
              {
                value: "split",
                label: "Separate peak & off-peak amounts",
              },
            ]}
          />
        </Form.Item>
      )}

      {(isFlatForm || isUniformTimeForm) &&
        !discountForm.dayScheduleEnabled && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Form.Item label="Discount Type">
              <Select
                value={discountForm.type}
                onChange={(v) =>
                  setDiscountForm({
                    ...discountForm,
                    type: v as "percentage" | "fixed",
                  })
                }
                options={[
                  { value: "percentage", label: "Percentage (%)" },
                  { value: "fixed", label: "Fixed Amount (PKR)" },
                ]}
              />
            </Form.Item>
            <Form.Item
              label={
                discountForm.type === "percentage"
                  ? "Discount Percentage"
                  : "Discount Amount (PKR)"
              }
              required
            >
              <InputNumber
                className="w-full"
                min={0.01}
                max={discountForm.type === "percentage" ? 100 : undefined}
                step={0.01}
                value={discountForm.value || undefined}
                onChange={(v) =>
                  setDiscountForm({
                    ...discountForm,
                    value: typeof v === "number" ? v : 0,
                  })
                }
                placeholder={
                  discountForm.type === "percentage" ? "30" : "1000"
                }
                addonAfter={
                  discountForm.type === "percentage" ? "%" : "PKR"
                }
              />
            </Form.Item>
          </div>
        )}
    </>
  );
}