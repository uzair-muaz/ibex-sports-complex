"use client";

import React, { useState } from "react";
import { Alert, App, Input, InputNumber, Modal, Radio, Typography } from "antd";
import type { Booking } from "@/types";
import { stillToPay } from "@/lib/venue-payments-rules";
import { useRecordBookingPaymentMutation } from "@/lib/tanstack/hooks/mutations";

const { Text } = Typography;

const pkr = (n: number) => `PKR ${Math.round(n).toLocaleString()}`;

type Props = {
  booking: Booking | null;
  open: boolean;
  onClose: () => void;
  /** Called with the saved booking so an open View box can update too. */
  onSaved?: (booking: Booking) => void;
};

/**
 * "Record payment": staff add money the customer paid after booking (usually
 * the rest, at the venue). Saved as a new entry; nothing else is edited.
 * Give it a `key` of the booking id so the form starts fresh for each booking.
 */
export function RecordPaymentModal({ booking, open, onClose, onSaved }: Props) {
  const { message } = App.useApp();
  const mutation = useRecordBookingPaymentMutation();
  const due = booking ? stillToPay(booking) : 0;
  const [amount, setAmount] = useState<number | null>(due || null);
  const [method, setMethod] = useState<"cash" | "bank">("cash");
  const [note, setNote] = useState("");

  if (!booking) return null;
  const paid = Math.round(booking.amountPaid ?? 0) + Math.round(booking.walletCreditUsed ?? 0);
  const tooMuch = (amount ?? 0) > due;
  const left = Math.max(0, due - (amount ?? 0));

  const save = async () => {
    if (!amount || amount <= 0 || tooMuch) return;
    try {
      const res = await mutation.mutateAsync({ bookingId: booking._id, amount, method, note: note || undefined });
      if (res.success) {
        message.success(`Payment of ${pkr(amount)} recorded`);
        if (res.booking) onSaved?.(res.booking);
        onClose();
      } else {
        message.error(res.error || "Could not save the payment");
      }
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Could not save the payment");
    }
  };

  return (
    <Modal
      title="Record payment"
      open={open}
      onCancel={onClose}
      onOk={save}
      okText="Save payment"
      okButtonProps={{ disabled: !amount || amount <= 0 || tooMuch, loading: mutation.isPending }}
      destroyOnHidden
    >
      <div className="space-y-4">
        <Text type="secondary">
          Use this when the customer pays you, for example the rest of the money at the venue. It is saved as a
          new payment; the booking itself is not changed.
        </Text>

        <div className="grid grid-cols-3 gap-2 rounded-lg border border-[var(--ant-color-border)] p-3 text-center">
          <div>
            <Text type="secondary" className="block text-xs">Booking price</Text>
            <Text strong>{pkr(booking.totalPrice)}</Text>
          </div>
          <div>
            <Text type="secondary" className="block text-xs">Paid so far</Text>
            <Text strong>{pkr(paid)}</Text>
          </div>
          <div>
            <Text type="secondary" className="block text-xs">Still to pay</Text>
            <Text strong className="text-amber-400!">{pkr(due)}</Text>
          </div>
        </div>

        {due === 0 ? (
          <Alert type="success" showIcon message="This booking is fully paid. Nothing to record." />
        ) : (
          <>
            <div className="space-y-1">
              <Text strong className="block">Amount the customer paid now (PKR)</Text>
              <InputNumber
                min={1}
                max={due}
                step={1}
                precision={0}
                style={{ width: "100%" }}
                value={amount}
                onChange={(v) => setAmount(typeof v === "number" ? v : null)}
              />
              <Text type={tooMuch ? "danger" : "secondary"} className="block text-xs">
                {tooMuch
                  ? `This is more than the ${pkr(due)} still to pay.`
                  : left === 0
                    ? "This pays the booking in full."
                    : `After this, ${pkr(left)} will still be left to pay.`}
              </Text>
            </div>

            <div className="space-y-1">
              <Text strong className="block">How did they pay?</Text>
              <Radio.Group
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                options={[
                  { value: "cash", label: "Cash" },
                  { value: "bank", label: "Bank transfer" },
                ]}
              />
            </div>

            <div className="space-y-1">
              <Text strong className="block">Note (optional)</Text>
              <Input
                maxLength={200}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Paid at the counter by Ali"
              />
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
