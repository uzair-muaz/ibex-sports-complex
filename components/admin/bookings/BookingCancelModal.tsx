"use client";

import React, { useState } from "react";
import { Alert, Button, Input, Modal, Radio, Space, Typography } from "antd";
import type { Booking } from "@/types";
import { formatDisplayDate } from "@/lib/utils";
import { getEndTimeLabel } from "./bookingDisplay";
import { staffRefundPlan, defaultRefundChoice, type StaffRefundChoice } from "@/lib/staff-refund-plan";

const { Text } = Typography;
const pkr = (n: number) => `PKR ${Math.round(n).toLocaleString("en-PK")}`;

type BookingCancelModalProps = {
  booking: Booking | null;
  open: boolean;
  isCancelling: boolean;
  onClose: () => void;
  onConfirm: (refund: { choice: StaffRefundChoice; note: string }) => void;
};

export function BookingCancelModal({
  booking,
  open,
  isCancelling,
  onClose,
  onConfirm,
}: BookingCancelModalProps) {
  // The page gives this window a new key for each booking, so these start fresh.
  const [choice, setChoice] = useState<StaffRefundChoice>(() => (booking ? defaultRefundChoice(booking) : "wallet"));
  const [note, setNote] = useState("");

  const paid = Math.round(booking?.amountPaid ?? 0);
  const walletUsed = Math.round(booking?.walletCreditUsed ?? 0);
  const points = booking?.loyaltyPointsRedeemed ?? 0;
  const hours = booking?.usedMembershipHours ? (booking.membershipHoursUsed ?? 0) : 0;
  const isGuest = !booking?.userId;
  const plan = booking ? staffRefundPlan(booking, choice) : null;
  const hasAnything = paid + walletUsed + points + hours > 0;
  const needsNote = choice === "none" && note.trim().length < 3;

  const backLines: string[] = [];
  if (plan) {
    if (plan.toWallet > 0) backLines.push(`${pkr(plan.toWallet)} to the customer's IBEX wallet`);
    if (plan.paidBack > 0) backLines.push(`${pkr(plan.paidBack)} you pay back by cash or bank`);
    if (plan.returnPointsAndHours && points > 0) backLines.push(`${points.toLocaleString()} points back`);
    if (plan.returnPointsAndHours && hours > 0) backLines.push(`${hours} membership hours back`);
  }

  return (
    <Modal
      title="Cancel Booking"
      open={open}
      onCancel={() => {
        if (isCancelling) return;
        onClose();
      }}
      footer={[
        <Button key="keep" onClick={onClose} disabled={isCancelling}>
          No, Keep Booking
        </Button>,
        <Button
          key="cancel"
          type="primary"
          danger
          loading={isCancelling}
          disabled={needsNote}
          onClick={() => onConfirm({ choice, note: note.trim() })}
        >
          Yes, Cancel Booking
        </Button>,
      ]}
    >
      {booking && (
        <div className="mt-4 space-y-4">
          <div className="space-y-2 rounded-lg bg-[var(--ant-color-bg-elevated)] p-4">
            <Row label="Booking ID:" value={`#${booking._id.slice(-8)}`} mono />
            <Row label="User:" value={`${booking.userName}${isGuest ? " (guest, no account)" : ""}`} />
            <Row label="Date:" value={formatDisplayDate(booking.date)} />
            <Row label="Time:" value={getEndTimeLabel(booking)} />
            <Row
              label="Customer paid:"
              value={
                [
                  paid > 0 ? `${pkr(paid)} money` : null,
                  walletUsed > 0 ? `${pkr(walletUsed)} wallet` : null,
                  points > 0 ? `${points.toLocaleString()} points` : null,
                  hours > 0 ? `${hours} h membership` : null,
                ]
                  .filter(Boolean)
                  .join(" · ") || "Nothing yet"
              }
            />
          </div>

          {hasAnything ? (
            <>
              <div>
                <Text strong>What should the customer get back?</Text>
                <Radio.Group
                  className="mt-2"
                  value={choice}
                  onChange={(e) => setChoice(e.target.value)}
                >
                  <Space orientation="vertical">
                    <Radio value="wallet" disabled={isGuest}>
                      Give it back to their IBEX wallet{isGuest ? " (not for guests)" : ""}
                    </Radio>
                    <Radio value="paid_back">I paid / will pay the money back by cash or bank</Radio>
                    <Radio value="none">Keep it (late cancel or no-show)</Radio>
                  </Space>
                </Radio.Group>
              </div>
              <Alert
                type={choice === "none" ? "warning" : "info"}
                showIcon
                title={backLines.length ? `They get back: ${backLines.join(", ")}.` : "Nothing goes back to the customer."}
              />
            </>
          ) : (
            <Text type="secondary">Nothing was paid yet, so there is nothing to give back.</Text>
          )}

          <Input.TextArea
            rows={2}
            maxLength={300}
            placeholder={choice === "none" ? "Reason (needed when the money is kept)" : "Reason (optional)"}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <Text type="secondary" className="text-sm">
            The customer gets a message that the venue cancelled the booking.
          </Text>
        </div>
      )}
    </Modal>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <Text type="secondary" className="text-sm">
        {label}
      </Text>
      <span className={`text-right text-sm text-[var(--ant-color-text)] ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}
