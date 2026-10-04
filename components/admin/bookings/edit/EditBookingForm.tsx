"use client";

import {
  Alert,
  Button,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Select,
  Typography,
} from "antd";
import type { FormInstance } from "antd/es/form";
import dayjs from "dayjs";
import type { AvailableStartTimeQuote } from "@/app/actions/bookings";
import type { Court } from "@/types";
import { EditBookingDurationPicker } from "./EditBookingDurationPicker";
import { EditBookingSlotSection } from "./EditBookingSlotSection";
import type { DurationPreset, EditFormValues } from "./types";

const { Title, Text } = Typography;

type SavedBookingPricing = {
  totalPrice: number;
  originalPrice?: number;
  discountAmount?: number;
};

export type EditBookingFormProps = {
  form: FormInstance<EditFormValues>;
  minPickDate: Date;
  onDateUserChange: () => void;
  durationPresets: DurationPreset[];
  durationHours: number;
  onDurationChange: (hours: number) => void;
  isInitialSlotLoading: boolean;
  courts: Court[];
  quotableQuotes: AvailableStartTimeQuote[];
  selectedQuote: AvailableStartTimeQuote | null;
  quotesRefreshing: boolean;
  savedBookingPricing: SavedBookingPricing | null;
  onSelectQuote: (quote: AvailableStartTimeQuote) => void;
  onPaymentChange: () => void;
  paymentTotal: number;
  formStatus: string | undefined;
  submitLoading: boolean;
  onCancel: () => void;
  onFinish: (values: EditFormValues) => void | Promise<void>;
};

export function EditBookingForm({
  form,
  minPickDate,
  onDateUserChange,
  durationPresets,
  durationHours,
  onDurationChange,
  isInitialSlotLoading,
  courts,
  quotableQuotes,
  selectedQuote,
  quotesRefreshing,
  savedBookingPricing,
  onSelectQuote,
  onPaymentChange,
  paymentTotal,
  formStatus,
  submitLoading,
  onCancel,
  onFinish,
}: EditBookingFormProps) {
  return (
    <Form<EditFormValues>
      form={form}
      layout="vertical"
      requiredMark={false}
      onFinish={onFinish}
      className="space-y-6"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Form.Item
          label="Date"
          name="date"
          rules={[{ required: true, message: "Please select a date" }]}
        >
          <DatePicker
            className="w-full"
            onChange={onDateUserChange}
            disabledDate={(current) => {
              if (!current) return false;
              const min = dayjs(minPickDate).startOf("day");
              return current.startOf("day").isBefore(min);
            }}
          />
        </Form.Item>

        <Form.Item
          label="Status"
          name="status"
          rules={[{ required: true, message: "Please select a status" }]}
        >
          <Select
            options={[
              { value: "pending_payment", label: "Pending Payment" },
              { value: "confirmed", label: "Confirmed" },
              { value: "cancelled", label: "Cancelled" },
              { value: "completed", label: "Completed" },
            ]}
          />
        </Form.Item>
      </div>

      <div className="space-y-4">
        <EditBookingDurationPicker
          presets={durationPresets}
          durationHours={durationHours}
          onChange={onDurationChange}
        />

        <EditBookingSlotSection
          isInitialSlotLoading={isInitialSlotLoading}
          courts={courts}
          quotableQuotes={quotableQuotes}
          selectedQuote={selectedQuote}
          durationHours={durationHours}
          quotesRefreshing={quotesRefreshing}
          savedBookingPricing={savedBookingPricing}
          onSelectQuote={onSelectQuote}
        />
      </div>

      <div className="space-y-4">
        <Title level={5} className="mb-0! text-[var(--ant-color-text)]!">
          User Details
        </Title>

        <Form.Item
          label="User Name"
          name="userName"
          rules={[{ required: true, message: "Please enter the user name" }]}
        >
          <Input />
        </Form.Item>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Form.Item
            label="Email"
            name="userEmail"
            rules={[
              { required: true, message: "Please enter the email" },
              { type: "email", message: "Please enter a valid email address" },
            ]}
          >
            <Input type="email" />
          </Form.Item>

          <Form.Item
            label={
              <>
                Phone <span className="text-red-400">*</span>
              </>
            }
            name="userPhone"
            rules={[
              { required: true, message: "Please enter the phone number" },
            ]}
          >
            <Input type="tel" placeholder="+92 300 1234567" />
          </Form.Item>
        </div>
      </div>

      <div className="space-y-4">
        <Title level={5} className="mb-0! text-[var(--ant-color-text)]!">
          Payment Details
        </Title>

        <Form.Item label="Payment received" className="mb-0">
          <div className="grid grid-cols-1 gap-4 rounded-lg border border-[var(--ant-color-border)] bg-[var(--ant-color-bg-container)] p-4 sm:grid-cols-2">
            <Form.Item
              label="Received online (PKR)"
              name="amountReceivedOnline"
              className="mb-0"
            >
              <InputNumber
                min={0}
                step={1}
                className="w-full"
                placeholder="0"
                onChange={onPaymentChange}
              />
            </Form.Item>

            <Form.Item
              label="Received in cash (PKR)"
              name="amountReceivedCash"
              className="mb-0"
            >
              <InputNumber
                min={0}
                step={1}
                className="w-full"
                placeholder="0"
                onChange={onPaymentChange}
              />
            </Form.Item>

            <div className="flex items-center gap-2 border-t border-[var(--ant-color-border)] pt-1 sm:col-span-2">
              <Text type="secondary" className="text-xs">
                Account received (total)
              </Text>
              <Text className="text-sm font-semibold text-[#2DD4BF]">
                PKR {paymentTotal.toLocaleString()}
              </Text>
            </div>
          </div>
        </Form.Item>

        {paymentTotal > 0 && formStatus === "pending_payment" && (
          <Alert
            type="info"
            showIcon
            message='Status will change to "Confirmed" when saved. Set status to "Completed" when payment is fully settled.'
          />
        )}
      </div>

      <div className="flex items-center justify-end gap-4 border-t border-[var(--ant-color-border)] pt-4">
        <Button type="text" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="primary"
          htmlType="submit"
          loading={submitLoading}
          disabled={!selectedQuote}
        >
          Update Booking
        </Button>
      </div>
    </Form>
  );
}
