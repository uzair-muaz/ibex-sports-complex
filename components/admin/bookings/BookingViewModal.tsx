"use client";

import React from "react";
import { Button, Modal, QRCode, Space, Tag, Typography } from "antd";
import type { Booking } from "@/types";
import {
  formatStatusLabel,
  getCourtName,
  getEndTimeLabel,
  getStatusTagColor,
} from "./bookingDisplay";

const { Text } = Typography;

export type ExtensionAvailability = {
  bookingId: string;
  checked: boolean;
  canExtend30: boolean;
  canExtend60: boolean;
} | null;

type BookingViewModalProps = {
  booking: Booking | null;
  open: boolean;
  onClose: () => void;
  extensionCheckBookingId: string | null;
  extensionLoading: boolean;
  extensionAvailability: ExtensionAvailability;
  extendingBookingId: string | null;
  extendingOption: 0.5 | 1 | null;
  onCheckExtensionAvailability: (bookingId: string) => void;
  onExtendBooking: (bookingId: string, extraDuration: 0.5 | 1) => void;
};

export function BookingViewModal({
  booking,
  open,
  onClose,
  extensionCheckBookingId,
  extensionLoading,
  extensionAvailability,
  extendingBookingId,
  extendingOption,
  onCheckExtensionAvailability,
  onExtendBooking,
}: BookingViewModalProps) {
  const viewingReceived = booking
    ? (booking.amountReceivedOnline ?? 0) +
        (booking.amountReceivedCash ?? 0) || (booking.amountPaid ?? 0)
    : 0;

  const viewingDiscount =
    booking &&
    booking.status === "completed" &&
    booking.totalPrice - viewingReceived > 0
      ? booking.totalPrice - viewingReceived
      : 0;

  return (
    <Modal
      title="Booking Details"
      open={open}
      onCancel={onClose}
      footer={<Button onClick={onClose}>Close</Button>}
      width="min(95vw, 768px)"
      styles={{ body: { maxHeight: "70vh", overflowY: "auto" } }}
    >
      {booking && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Text type="secondary" className="text-xs">
                Booking ID
              </Text>
              <p className="font-mono text-sm text-[var(--ant-color-text)]">
                #{booking._id.slice(-8)}
              </p>
            </div>
            <div className="space-y-1">
              <Text type="secondary" className="text-xs">
                Status
              </Text>
              <div>
                <Tag color={getStatusTagColor(booking.status)}>
                  {formatStatusLabel(booking.status)}
                </Tag>
              </div>
            </div>
            <div className="space-y-1">
              <Text type="secondary" className="text-xs">
                User Name
              </Text>
              <p className="text-[var(--ant-color-text)]">{booking.userName}</p>
            </div>
            <div className="space-y-1">
              <Text type="secondary" className="text-xs">
                Email
              </Text>
              <p className="text-sm text-[var(--ant-color-text)]">
                {booking.userEmail}
              </p>
            </div>
            <div className="space-y-1">
              <Text type="secondary" className="text-xs">
                Phone
              </Text>
              <p className="text-[var(--ant-color-text)]">
                {booking.userPhone || "N/A"}
              </p>
            </div>
            <div className="space-y-1">
              <Text type="secondary" className="text-xs">
                Court
              </Text>
              <p className="text-[var(--ant-color-text)]">
                {getCourtName(booking)}
              </p>
            </div>
            <div className="space-y-1">
              <Text type="secondary" className="text-xs">
                Date
              </Text>
              <p className="text-[var(--ant-color-text)]">
                {new Date(booking.date).toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
            <div className="space-y-1">
              <Text type="secondary" className="text-xs">
                Time
              </Text>
              <p className="text-[var(--ant-color-text)]">
                {getEndTimeLabel(booking)}
              </p>
            </div>
            <div className="space-y-1">
              <Text type="secondary" className="text-xs">
                Duration
              </Text>
              <p className="text-[var(--ant-color-text)]">
                {booking.duration} hour
                {booking.duration !== 1 ? "s" : ""}
              </p>
            </div>

            {(booking.status === "confirmed" ||
              booking.status === "pending_payment") && (
              <div className="space-y-2 pt-1 sm:col-span-2">
                <Text type="secondary" className="text-xs">
                  Extend Booking
                </Text>
                <Space wrap>
                  <Button
                    onClick={() => onCheckExtensionAvailability(booking._id)}
                    loading={
                      extensionCheckBookingId === booking._id &&
                      extensionLoading
                    }
                  >
                    Check availability
                  </Button>
                  {extensionAvailability?.bookingId === booking._id &&
                    extensionAvailability.checked && (
                      <>
                        <Button
                          onClick={() => onExtendBooking(booking._id, 0.5)}
                          disabled={!extensionAvailability.canExtend30}
                          loading={
                            extendingBookingId === booking._id &&
                            extendingOption === 0.5
                          }
                        >
                          +30 mins
                        </Button>
                        <Button
                          onClick={() => onExtendBooking(booking._id, 1)}
                          disabled={!extensionAvailability.canExtend60}
                          loading={
                            extendingBookingId === booking._id &&
                            extendingOption === 1
                          }
                        >
                          +60 mins
                        </Button>
                      </>
                    )}
                </Space>
                <Text type="secondary" className="block text-[11px]">
                  Click check first. Only valid extension options will be
                  enabled.
                </Text>
              </div>
            )}

            {booking.discountAmount && booking.discountAmount > 0 ? (
              <div className="col-span-2 space-y-2 rounded-lg bg-[var(--ant-color-bg-elevated)] p-4">
                <Text type="secondary" className="text-xs">
                  Price Breakdown
                </Text>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[var(--ant-color-text-secondary)]">
                      Subtotal
                    </span>
                    <span className="text-[var(--ant-color-text-secondary)]">
                      PKR{" "}
                      {(
                        booking.originalPrice ||
                        booking.totalPrice + booking.discountAmount
                      ).toLocaleString()}
                    </span>
                  </div>
                  {booking.discounts?.map((d, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between"
                    >
                      <span className="text-sm text-green-400">
                        {d.name} (
                        {d.type === "percentage"
                          ? `${d.value}%`
                          : `PKR ${d.value}`}
                        )
                      </span>
                      <span className="text-green-400">
                        -PKR {d.amountSaved.toLocaleString()}
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between border-t border-[var(--ant-color-border)] pt-2">
                    <span className="font-semibold text-[var(--ant-color-text)]">
                      Total
                    </span>
                    <span className="font-bold text-[#2DD4BF]">
                      PKR {booking.totalPrice.toLocaleString()}
                    </span>
                  </div>
                  <div className="rounded border border-green-500/30 bg-green-500/10 px-2 py-1 text-center">
                    <span className="text-xs text-green-400">
                      Saved PKR {booking.discountAmount.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <Text type="secondary" className="text-xs">
                  Total Price
                </Text>
                <p className="font-semibold text-[#2DD4BF]">
                  PKR {booking.totalPrice.toLocaleString()}
                </p>
              </div>
            )}

            <div className="space-y-1">
              <Text type="secondary" className="text-xs">
                Account received
              </Text>
              <p className="font-semibold text-[var(--ant-color-text)]">
                PKR {viewingReceived.toLocaleString()}
              </p>
              {((booking.amountReceivedOnline ?? 0) > 0 ||
                (booking.amountReceivedCash ?? 0) > 0) && (
                <Text type="secondary" className="text-xs">
                  Online: PKR{" "}
                  {(booking.amountReceivedOnline ?? 0).toLocaleString()} ·
                  Cash: PKR{" "}
                  {(booking.amountReceivedCash ?? 0).toLocaleString()}
                </Text>
              )}
            </div>

            {viewingDiscount > 0 && (
              <div className="space-y-1">
                <Text type="secondary" className="text-xs">
                  Discount (total − received)
                </Text>
                <p className="font-semibold text-amber-400">
                  PKR {viewingDiscount.toLocaleString()}
                </p>
              </div>
            )}

            {viewingReceived < booking.totalPrice && (
              <div className="space-y-1">
                <Text type="secondary" className="text-xs">
                  Remaining balance
                </Text>
                <p className="font-semibold text-yellow-400">
                  PKR{" "}
                  {(booking.totalPrice - viewingReceived).toLocaleString()}
                </p>
              </div>
            )}
          </div>

          <div className="border-t border-[var(--ant-color-border)] pt-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div>
                <Text type="secondary" className="mb-4 block text-xs">
                  Entry Verification QR Code
                </Text>
                <div className="flex justify-center lg:justify-start">
                  <div className="inline-block rounded-xl bg-white p-3 sm:p-4">
                    <QRCode
                      value={`${typeof window !== "undefined" ? window.location.origin : ""}/booking/verify/${booking._id}`}
                      size={160}
                    />
                  </div>
                </div>
                <Text
                  type="secondary"
                  className="mt-2 block text-center text-xs lg:text-left"
                >
                  Scan to verify booking entry
                </Text>
              </div>

              <div>
                <Text type="secondary" className="mb-4 block text-xs">
                  Feedback QR Code
                </Text>
                <div className="flex justify-center lg:justify-start">
                  <div className="inline-block rounded-xl bg-white p-3 sm:p-4">
                    <QRCode
                      value={`${typeof window !== "undefined" ? window.location.origin : ""}/feedback/${booking._id}`}
                      size={160}
                    />
                  </div>
                </div>
                <Text
                  type="secondary"
                  className="mt-2 block text-center text-xs lg:text-left"
                >
                  Share with customer for feedback collection
                </Text>
              </div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
