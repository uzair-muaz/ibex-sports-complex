"use client";

import React from "react";
import {
  Button,
  Checkbox,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Typography,
} from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import type { Court, PricingLabel } from "@/types";
import {
  COURT_TYPE_OPTIONS,
  PRICING_LABEL_OPTIONS,
  TIME_OPTIONS,
  appendPricingPeriod,
  dropPricingPeriod,
  patchPricingPeriod,
  type CourtFormState,
} from "./courtHelpers";
import { COURT_FEATURE_LABELS } from "@/lib/court-features";
import { priceUnit } from "@/lib/pricing-utils";

const { Text } = Typography;

const FEATURE_OPTIONS = Object.entries(COURT_FEATURE_LABELS).map(
  ([value, label]) => ({ value, label }),
);
const { TextArea } = Input;

type CourtFormModalProps = {
  open: boolean;
  editingCourt: Court | null;
  isSubmitting: boolean;
  courtForm: CourtFormState;
  setCourtForm: React.Dispatch<React.SetStateAction<CourtFormState>>;
  onClose: () => void;
  onSubmit: () => void;
};

export function CourtFormModal({
  open,
  editingCourt,
  isSubmitting,
  courtForm,
  setCourtForm,
  onClose,
  onSubmit,
}: CourtFormModalProps) {
  // Futsal prices are saved per 90 minutes, other sports per hour.
  const unit = priceUnit(courtForm.type);

  const addPricingPeriod = (label: PricingLabel) => {
    setCourtForm((prev) => appendPricingPeriod(prev, label));
  };

  const updatePricingPeriod = (
    index: number,
    updates: Parameters<typeof patchPricingPeriod>[2],
  ) => {
    setCourtForm((prev) => patchPricingPeriod(prev, index, updates));
  };

  const removePricingPeriod = (index: number) => {
    setCourtForm((prev) => dropPricingPeriod(prev, index));
  };

  return (
    <Modal
      title={editingCourt ? "Edit Court" : "Add New Court"}
      open={open}
      onCancel={onClose}
      footer={null}
      width={672}
      destroyOnHidden
    >
      <Text type="secondary" className="mb-4 block">
        {editingCourt
          ? "Update court details and pricing"
          : "Create a new court with details and pricing"}
      </Text>

      <Form layout="vertical" onFinish={onSubmit}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Form.Item label="Court Name" required>
            <Input
              value={courtForm.name}
              onChange={(e) =>
                setCourtForm({ ...courtForm, name: e.target.value })
              }
              placeholder="Court Alpha"
            />
          </Form.Item>
          <Form.Item label="Court Type" required>
            <Select
              value={courtForm.type}
              onChange={(v) =>
                setCourtForm({
                  ...courtForm,
                  type: v as Court["type"],
                })
              }
              options={COURT_TYPE_OPTIONS}
            />
          </Form.Item>
        </div>

        <Form.Item label="Description" required>
          <TextArea
            value={courtForm.description}
            onChange={(e) =>
              setCourtForm({ ...courtForm, description: e.target.value })
            }
            rows={3}
            placeholder="Professional court with premium features..."
          />
        </Form.Item>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Form.Item
            label={`Base Price ${unit.long} (PKR)`}
            required
            extra={
              <Text type="secondary" className="text-[11px]">
                Used when peak/off-peak pricing is disabled. When peak/off-peak
                is enabled, prices from the periods below are used instead.
              </Text>
            }
          >
            <InputNumber
              style={{ width: "100%" }}
              min={0}
              step={0.01}
              value={courtForm.pricePerHour}
              onChange={(v) =>
                setCourtForm({
                  ...courtForm,
                  pricePerHour: typeof v === "number" ? v : 0,
                })
              }
              placeholder="5000"
              disabled={courtForm.timeBasedPricingEnabled}
            />
          </Form.Item>
          <Form.Item
            label={`Weekend Price ${unit.long} (Sat–Sun)`}
            extra={
              <Text type="secondary" className="text-[11px]">
                Leave empty to charge the base price on weekends too.
              </Text>
            }
          >
            <InputNumber
              style={{ width: "100%" }}
              min={0}
              step={0.01}
              value={courtForm.weekendPricePerHour}
              onChange={(v) =>
                setCourtForm({
                  ...courtForm,
                  weekendPricePerHour: typeof v === "number" ? v : null,
                })
              }
              placeholder="Same as base price"
              disabled={courtForm.timeBasedPricingEnabled}
            />
          </Form.Item>
          <Form.Item label="Settings">
            <Space direction="vertical">
              <Checkbox
                checked={courtForm.isActive}
                onChange={(e) =>
                  setCourtForm({ ...courtForm, isActive: e.target.checked })
                }
              >
                Active
              </Checkbox>
              <Checkbox
                checked={courtForm.timeBasedPricingEnabled}
                onChange={(e) =>
                  setCourtForm({
                    ...courtForm,
                    timeBasedPricingEnabled: e.target.checked,
                  })
                }
              >
                Enable peak/off-peak pricing
              </Checkbox>
            </Space>
          </Form.Item>
        </div>

        {courtForm.timeBasedPricingEnabled && (
          <div className="mt-2 space-y-3 rounded-lg border border-[var(--ant-color-border)] p-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-[var(--ant-color-text)]">
                  Peak & Off-peak Hours
                </p>
                <Text type="secondary" className="text-xs">
                  Set peak and off-peak rates for the full 24-hour day. Periods
                  must cover every half-hour from 12:00 AM to 12:00 AM with no
                  gaps.
                </Text>
              </div>
              <Space>
                <Button
                  size="small"
                  onClick={() => addPricingPeriod("off_peak")}
                >
                  Add Off-peak
                </Button>
                <Button size="small" onClick={() => addPricingPeriod("peak")}>
                  Add Peak
                </Button>
              </Space>
            </div>

            {courtForm.pricingPeriods.length === 0 ? (
              <Text type="secondary" className="text-xs">
                No dynamic pricing periods yet. Use the buttons above to add
                off-peak or peak ranges.
              </Text>
            ) : (
              <div className="space-y-2">
                {courtForm.pricingPeriods.map((period, index) => {
                  const previous = courtForm.pricingPeriods[index - 1];
                  const minStart = previous ? previous.endHour : 0;
                  const startOptions = TIME_OPTIONS.filter(
                    (opt) => opt.value >= minStart && opt.value <= 24,
                  );
                  const endOptions = TIME_OPTIONS.filter(
                    (opt) => opt.value !== period.startHour,
                  );

                  return (
                    <div
                      key={index}
                      className="space-y-3 rounded-md border border-[var(--ant-color-border)] bg-[var(--ant-color-bg-elevated)] p-3"
                    >
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <Form.Item label="Type" className="mb-0">
                          <Select
                            size="small"
                            value={period.label}
                            onChange={(v) =>
                              updatePricingPeriod(index, {
                                label: v as "off_peak" | "peak",
                              })
                            }
                            options={PRICING_LABEL_OPTIONS}
                          />
                        </Form.Item>

                        <Form.Item label={`Price ${unit.long} (PKR)`} className="mb-0">
                          <InputNumber
                            style={{ width: "100%" }}
                            size="small"
                            min={0}
                            step={0.01}
                            value={period.pricePerHour}
                            onChange={(v) =>
                              updatePricingPeriod(index, {
                                pricePerHour: typeof v === "number" ? v : 0,
                              })
                            }
                          />
                        </Form.Item>

                        <Form.Item label={`Weekend Price ${unit.long} (Sat–Sun)`} className="mb-0">
                          <InputNumber
                            style={{ width: "100%" }}
                            size="small"
                            min={0}
                            step={0.01}
                            placeholder="Same as weekday"
                            value={period.weekendPricePerHour ?? null}
                            onChange={(v) =>
                              updatePricingPeriod(index, {
                                weekendPricePerHour: typeof v === "number" ? v : null,
                              })
                            }
                          />
                        </Form.Item>
                        <div className="hidden md:block" />

                        <Form.Item label="Start Time" className="mb-0">
                          <Select
                            size="small"
                            value={period.startHour}
                            onChange={(v) =>
                              updatePricingPeriod(index, { startHour: v })
                            }
                            options={startOptions}
                            showSearch
                            optionFilterProp="label"
                            listHeight={192}
                          />
                        </Form.Item>

                        <Form.Item label="End Time" className="mb-0">
                          <Select
                            size="small"
                            value={period.endHour}
                            onChange={(v) =>
                              updatePricingPeriod(index, { endHour: v })
                            }
                            options={endOptions}
                            showSearch
                            optionFilterProp="label"
                            listHeight={384}
                          />
                        </Form.Item>
                      </div>

                      <div className="flex sm:justify-end">
                        <Button
                          type="text"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => removePricingPeriod(index)}
                          title="Remove period"
                        />
                      </div>
                    </div>
                  );
                })}
                <Text type="secondary" className="text-[11px]">
                  Periods must tile the full day (12:00 AM → 12:00 AM). Ranges
                  can wrap past midnight (e.g. 10:00 PM – 2:00 AM for evening
                  peak). Example: Off-peak 12:00 AM–5:00 PM, Peak 5:00 PM–12:00
                  AM.
                </Text>
              </div>
            )}
          </div>
        )}

        <div className="mt-6 rounded-lg border border-white/10 p-4">
          <Text strong className="block">
            Mobile app details
          </Text>
          <Text type="secondary" className="mb-3 block text-[11px]">
            Shown on the court card in the app. The website ignores these.
          </Text>
          <Form.Item
            label="Photo link"
            extra={
              <Text type="secondary" className="text-[11px]">
                An https:// link (or /images/… on this site). Leave empty to use
                the sport&apos;s photo.
              </Text>
            }
          >
            <Input
              value={courtForm.image}
              onChange={(e) =>
                setCourtForm({ ...courtForm, image: e.target.value })
              }
              placeholder="https://…/court1.jpg"
            />
          </Form.Item>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Form.Item label="Surface">
              <Input
                value={courtForm.surfaceLabel}
                maxLength={40}
                onChange={(e) =>
                  setCourtForm({ ...courtForm, surfaceLabel: e.target.value })
                }
                placeholder="Pro turf"
              />
            </Form.Item>
            <Form.Item label="Filters">
              <Space direction="vertical">
                <Checkbox
                  checked={courtForm.isIndoor}
                  onChange={(e) =>
                    setCourtForm({ ...courtForm, isIndoor: e.target.checked })
                  }
                >
                  Indoor
                </Checkbox>
                <Checkbox
                  checked={courtForm.hasRacketRental}
                  onChange={(e) =>
                    setCourtForm({
                      ...courtForm,
                      hasRacketRental: e.target.checked,
                    })
                  }
                >
                  Racket rental
                </Checkbox>
              </Space>
            </Form.Item>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Form.Item label="Features">
              <Select
                mode="multiple"
                value={courtForm.featureKeys}
                onChange={(v) =>
                  setCourtForm({ ...courtForm, featureKeys: v as string[] })
                }
                options={FEATURE_OPTIONS}
                placeholder="LED lighting, Benches…"
              />
            </Form.Item>
            <Form.Item label="Main feature (highlight)">
              <Select
                allowClear
                value={courtForm.highlightKey ?? undefined}
                onChange={(v) =>
                  setCourtForm({
                    ...courtForm,
                    highlightKey: (v as string | undefined) ?? null,
                  })
                }
                options={FEATURE_OPTIONS}
                placeholder="Match replay"
              />
            </Form.Item>
          </div>
        </div>

        <Form.Item className="mb-0 mt-6">
          <Space className="flex justify-end">
            <Button onClick={onClose}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={isSubmitting}>
              {editingCourt ? "Update Court" : "Create Court"}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
}
