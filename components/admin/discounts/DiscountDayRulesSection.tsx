"use client";

import React from "react";
import {
  Button,
  Form,
  InputNumber,
  Select,
  Space,
  Switch,
  Typography,
} from "antd";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import { DAY_LABELS } from "@/lib/discount-utils";
import type { DayRuleRateMode } from "@/types";
import {
  emptyDayRule,
  getDaysClaimedByOtherRules,
  type DayRuleForm,
  type DiscountFormState,
} from "./discountHelpers";

const { Text } = Typography;

type DiscountDayRulesSectionProps = {
  discountForm: DiscountFormState;
  setDiscountForm: React.Dispatch<React.SetStateAction<DiscountFormState>>;
};

export function DiscountDayRulesSection({
  discountForm,
  setDiscountForm,
}: DiscountDayRulesSectionProps) {
  const toggleDayInRule = (ruleIndex: number, day: number) => {
    setDiscountForm((prev) => {
      const claimedElsewhere = getDaysClaimedByOtherRules(
        prev.dayRules,
        ruleIndex,
      );
      const isSelected = prev.dayRules[ruleIndex]?.days.includes(day);
      if (!isSelected && claimedElsewhere.has(day)) return prev;

      const rules = [...prev.dayRules];
      const rule = { ...rules[ruleIndex] };
      rule.days = isSelected
        ? rule.days.filter((d) => d !== day)
        : [...rule.days, day].sort((a, b) => a - b);
      rules[ruleIndex] = rule;
      return { ...prev, dayRules: rules };
    });
  };

  const updateDayRule = (ruleIndex: number, patch: Partial<DayRuleForm>) => {
    setDiscountForm((prev) => {
      const rules = [...prev.dayRules];
      rules[ruleIndex] = { ...rules[ruleIndex], ...patch };
      return { ...prev, dayRules: rules };
    });
  };

  const addDayRule = () => {
    setDiscountForm((prev) => ({
      ...prev,
      dayScheduleEnabled: true,
      dayRules: [...prev.dayRules, emptyDayRule()],
    }));
  };

  const removeDayRule = (ruleIndex: number) => {
    setDiscountForm((prev) => ({
      ...prev,
      dayRules: prev.dayRules.filter((_, i) => i !== ruleIndex),
    }));
  };

  return (
    <div className="rounded-lg border border-[var(--ant-color-border)] bg-[var(--ant-color-bg-container)] p-4 space-y-4 mb-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-[var(--ant-color-text)]">
            Different rate by day
          </div>
          <Text type="secondary" className="text-xs">
            Match court peak/off-peak pricing. e.g. weekdays off-peak PKR 1,500
            off and peak PKR 2,500 off — different per day group.
          </Text>
        </div>
        <Switch
          checked={discountForm.dayScheduleEnabled}
          checkedChildren="Enabled"
          unCheckedChildren="Enable"
          onChange={(enabled) =>
            setDiscountForm((prev) => ({
              ...prev,
              dayScheduleEnabled: enabled,
              dayRules:
                enabled && prev.dayRules.length === 0
                  ? [emptyDayRule()]
                  : prev.dayRules,
            }))
          }
        />
      </div>

      {discountForm.dayScheduleEnabled && (
        <div className="space-y-4">
          <Button
            size="small"
            icon={<PlusOutlined />}
            onClick={() => addDayRule()}
          >
            Add rule
          </Button>

          {discountForm.dayRules.map((rule, ruleIndex) => (
            <div
              key={ruleIndex}
              className="rounded-md border border-[var(--ant-color-border)] bg-[var(--ant-color-bg-elevated)] p-3 space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-[var(--ant-color-text-secondary)] uppercase tracking-wide">
                  Rule {ruleIndex + 1}
                </span>
                {discountForm.dayRules.length > 1 && (
                  <Button
                    type="text"
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                    onClick={() => removeDayRule(ruleIndex)}
                  />
                )}
              </div>

              <Space wrap size={[4, 4]}>
                {DAY_LABELS.map((label, day) => {
                  const claimedElsewhere = getDaysClaimedByOtherRules(
                    discountForm.dayRules,
                    ruleIndex,
                  );
                  const isSelected = rule.days.includes(day);
                  const isDisabled =
                    !isSelected && claimedElsewhere.has(day);

                  return (
                    <Button
                      key={day}
                      size="small"
                      type={isSelected ? "primary" : "default"}
                      disabled={isDisabled}
                      title={
                        isDisabled
                          ? `${label} is already used in another rule`
                          : undefined
                      }
                      onClick={() => toggleDayInRule(ruleIndex, day)}
                    >
                      {label}
                    </Button>
                  );
                })}
              </Space>

              <Form.Item label="Rate style" className="mb-0">
                <Select
                  size="small"
                  value={rule.rateMode}
                  onChange={(v) =>
                    updateDayRule(ruleIndex, {
                      rateMode: v as DayRuleRateMode,
                    })
                  }
                  options={[
                    { value: "uniform", label: "Same all day" },
                    {
                      value: "split",
                      label: "Peak & off-peak (uses court hours)",
                    },
                  ]}
                />
              </Form.Item>

              {rule.rateMode === "uniform" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Form.Item label="Type" className="mb-0">
                    <Select
                      size="small"
                      value={rule.type}
                      onChange={(v) =>
                        updateDayRule(ruleIndex, {
                          type: v as "percentage" | "fixed",
                        })
                      }
                      options={[
                        {
                          value: "percentage",
                          label: "Percentage (%)",
                        },
                        { value: "fixed", label: "Fixed (PKR)" },
                      ]}
                    />
                  </Form.Item>
                  <Form.Item
                    label={
                      rule.type === "percentage"
                        ? "Discount %"
                        : "Amount off (PKR)"
                    }
                    className="mb-0"
                  >
                    <InputNumber
                      className="w-full"
                      size="small"
                      min={0.01}
                      max={rule.type === "percentage" ? 100 : undefined}
                      step={0.01}
                      value={rule.value || undefined}
                      onChange={(v) =>
                        updateDayRule(ruleIndex, {
                          value: typeof v === "number" ? v : 0,
                        })
                      }
                      placeholder={
                        rule.type === "percentage" ? "50" : "2500"
                      }
                      addonAfter={
                        rule.type === "percentage" ? "%" : "PKR"
                      }
                    />
                  </Form.Item>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-md border border-[var(--ant-color-border)] bg-[var(--ant-color-bg-elevated)] p-3 space-y-2">
                    <div className="text-xs font-semibold text-[var(--ant-color-text-secondary)]">
                      Off-peak hours
                    </div>
                    <Select
                      size="small"
                      value={rule.offPeakType}
                      onChange={(v) =>
                        updateDayRule(ruleIndex, {
                          offPeakType: v as "percentage" | "fixed",
                        })
                      }
                      options={[
                        { value: "percentage", label: "%" },
                        { value: "fixed", label: "PKR" },
                      ]}
                    />
                    <InputNumber
                      className="w-full"
                      size="small"
                      min={0.01}
                      max={
                        rule.offPeakType === "percentage" ? 100 : undefined
                      }
                      step={0.01}
                      value={
                        rule.offPeakValue === ""
                          ? undefined
                          : Number(rule.offPeakValue)
                      }
                      onChange={(v) =>
                        updateDayRule(ruleIndex, {
                          offPeakValue: v == null ? "" : v,
                        })
                      }
                      placeholder="Optional"
                      addonAfter={
                        rule.offPeakType === "percentage" ? "%" : "PKR"
                      }
                    />
                  </div>
                  <div className="rounded-md border border-[var(--ant-color-border)] bg-[var(--ant-color-bg-elevated)] p-3 space-y-2">
                    <div className="text-xs font-semibold text-[var(--ant-color-text-secondary)]">
                      Peak hours
                    </div>
                    <Select
                      size="small"
                      value={rule.peakType}
                      onChange={(v) =>
                        updateDayRule(ruleIndex, {
                          peakType: v as "percentage" | "fixed",
                        })
                      }
                      options={[
                        { value: "percentage", label: "%" },
                        { value: "fixed", label: "PKR" },
                      ]}
                    />
                    <InputNumber
                      className="w-full"
                      size="small"
                      min={0.01}
                      max={rule.peakType === "percentage" ? 100 : undefined}
                      step={0.01}
                      value={
                        rule.peakValue === ""
                          ? undefined
                          : Number(rule.peakValue)
                      }
                      onChange={(v) =>
                        updateDayRule(ruleIndex, {
                          peakValue: v == null ? "" : v,
                        })
                      }
                      placeholder="Optional"
                      addonAfter={
                        rule.peakType === "percentage" ? "%" : "PKR"
                      }
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
