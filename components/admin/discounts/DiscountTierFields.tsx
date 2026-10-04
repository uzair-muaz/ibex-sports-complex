"use client";

import React from "react";
import { Button, Checkbox, Form, InputNumber, Select, Space, Typography } from "antd";
import type { CourtType, DiscountPricingTier } from "@/types";
import {
  COURT_TYPES,
  HOUR_OPTIONS,
  type DiscountFormState,
} from "./discountHelpers";

const { Text } = Typography;

type DiscountTierFieldsProps = {
  discountForm: DiscountFormState;
  setDiscountForm: React.Dispatch<React.SetStateAction<DiscountFormState>>;
  isSplitForm: boolean;
  isTimeForm: boolean;
  isUniformTimeForm: boolean;
};

export function DiscountTierFields({
  discountForm,
  setDiscountForm,
  isSplitForm,
  isTimeForm,
  isUniformTimeForm,
}: DiscountTierFieldsProps) {
  const handleCourtTypeToggle = (courtType: CourtType) => {
    setDiscountForm((prev) => {
      const newCourtTypes = prev.courtTypes.includes(courtType)
        ? prev.courtTypes.filter((ct) => ct !== courtType)
        : [...prev.courtTypes, courtType];
      return { ...prev, courtTypes: newCourtTypes };
    });
  };

  return (
    <>
      {isSplitForm && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div className="rounded-lg border border-[var(--ant-color-border)] bg-[var(--ant-color-bg-container)] p-4 space-y-3">
            <div className="text-xs font-semibold text-[var(--ant-color-text-secondary)] uppercase tracking-wide">
              Peak hours
            </div>
            <Form.Item label="Type" className="mb-2">
              <Select
                value={discountForm.peakType}
                onChange={(v) =>
                  setDiscountForm({
                    ...discountForm,
                    peakType: v as "percentage" | "fixed",
                  })
                }
                options={[
                  { value: "percentage", label: "Percentage (%)" },
                  { value: "fixed", label: "Fixed (PKR)" },
                ]}
              />
            </Form.Item>
            <Form.Item label="Amount" className="mb-0">
              <InputNumber
                className="w-full"
                min={0.01}
                max={
                  discountForm.peakType === "percentage" ? 100 : undefined
                }
                step={0.01}
                value={
                  discountForm.peakValue === ""
                    ? undefined
                    : Number(discountForm.peakValue)
                }
                onChange={(v) =>
                  setDiscountForm({
                    ...discountForm,
                    peakValue: v == null ? "" : v,
                  })
                }
                placeholder="Optional"
                addonAfter={
                  discountForm.peakType === "percentage" ? "%" : "PKR"
                }
              />
            </Form.Item>
          </div>
          <div className="rounded-lg border border-[var(--ant-color-border)] bg-[var(--ant-color-bg-container)] p-4 space-y-3">
            <div className="text-xs font-semibold text-[var(--ant-color-text-secondary)] uppercase tracking-wide">
              Off-peak hours
            </div>
            <Form.Item label="Type" className="mb-2">
              <Select
                value={discountForm.offPeakType}
                onChange={(v) =>
                  setDiscountForm({
                    ...discountForm,
                    offPeakType: v as "percentage" | "fixed",
                  })
                }
                options={[
                  { value: "percentage", label: "Percentage (%)" },
                  { value: "fixed", label: "Fixed (PKR)" },
                ]}
              />
            </Form.Item>
            <Form.Item label="Amount" className="mb-0">
              <InputNumber
                className="w-full"
                min={0.01}
                max={
                  discountForm.offPeakType === "percentage"
                    ? 100
                    : undefined
                }
                step={0.01}
                value={
                  discountForm.offPeakValue === ""
                    ? undefined
                    : Number(discountForm.offPeakValue)
                }
                onChange={(v) =>
                  setDiscountForm({
                    ...discountForm,
                    offPeakValue: v == null ? "" : v,
                  })
                }
                placeholder="Optional"
                addonAfter={
                  discountForm.offPeakType === "percentage" ? "%" : "PKR"
                }
              />
            </Form.Item>
          </div>
        </div>
      )}

      <Form.Item label="Apply to Court Types">
        <Space wrap>
          <Button
            size="small"
            type={
              discountForm.courtTypes.length === 0 ? "primary" : "default"
            }
            onClick={() =>
              setDiscountForm({ ...discountForm, courtTypes: [] })
            }
          >
            All Courts
          </Button>
          {COURT_TYPES.map((ct) => (
            <Button
              key={ct}
              size="small"
              type={
                discountForm.courtTypes.includes(ct) ? "primary" : "default"
              }
              onClick={() => handleCourtTypeToggle(ct)}
            >
              {ct}
            </Button>
          ))}
        </Space>
        <Text type="secondary" className="mt-2 block text-xs">
          {discountForm.courtTypes.length === 0
            ? "Discount applies to all court types"
            : `Discount applies to: ${discountForm.courtTypes.join(", ")}`}
        </Text>
      </Form.Item>

      {isTimeForm && (
        <>
          <div
            className={`grid grid-cols-1 gap-4 ${
              isUniformTimeForm ? "sm:grid-cols-2" : ""
            }`}
          >
            <Form.Item label="Min booking (h)">
              <InputNumber
                className="w-full"
                min={0.5}
                step={0.5}
                placeholder="Any"
                value={
                  discountForm.minBookingHours === ""
                    ? undefined
                    : Number(discountForm.minBookingHours)
                }
                onChange={(v) =>
                  setDiscountForm({
                    ...discountForm,
                    minBookingHours: v == null ? "" : v,
                  })
                }
              />
            </Form.Item>
            {isUniformTimeForm && (
              <Form.Item label="Booking start tier">
                <Select
                  value={discountForm.pricingTier}
                  onChange={(v) =>
                    setDiscountForm({
                      ...discountForm,
                      pricingTier: v as DiscountPricingTier,
                    })
                  }
                  options={[
                    { value: "any", label: "Any (ignore tier)" },
                    { value: "peak", label: "Peak start only" },
                    { value: "off_peak", label: "Off-peak start only" },
                  ]}
                />
              </Form.Item>
            )}
          </div>

          <Form.Item label="Promo hours">
            <Checkbox
              checked={discountForm.allDay}
              onChange={(e) =>
                setDiscountForm({
                  ...discountForm,
                  allDay: e.target.checked,
                })
              }
            >
              All day (no clock restriction)
            </Checkbox>
            {!discountForm.allDay && (
              <div className="mt-3 grid grid-cols-2 gap-4">
                <Form.Item label="Start Hour" className="mb-0">
                  <Select
                    value={discountForm.startHour}
                    onChange={(v) =>
                      setDiscountForm({
                        ...discountForm,
                        startHour: v,
                      })
                    }
                    options={HOUR_OPTIONS}
                  />
                </Form.Item>
                <Form.Item label="End Hour" className="mb-0">
                  <Select
                    value={discountForm.endHour}
                    onChange={(v) =>
                      setDiscountForm({
                        ...discountForm,
                        endHour: v,
                      })
                    }
                    options={HOUR_OPTIONS}
                  />
                </Form.Item>
              </div>
            )}
          </Form.Item>
        </>
      )}
    </>
  );
}
