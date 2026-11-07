"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { App, Input, InputNumber, Modal, Segmented, Space, Table, Typography } from "antd";
import { bffFetch } from "@/lib/bff/client";
import type { WalletItem } from "@/lib/api/wallet-view";

const { Text } = Typography;
type Action = "credit" | "debit" | "bank_payout";

const pkr = (n: number) => `PKR ${Math.round(n).toLocaleString("en-PK")}`;
const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-PK", { timeZone: "Asia/Karachi", dateStyle: "medium", timeStyle: "short" }) : "—";
const newRequestId = () => crypto.randomUUID();

/** Staff: see and change one customer's IBEX wallet. */
export function WalletModal({ user, onClose }: { user: { _id: string; name?: string } | null; onClose: () => void }) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [action, setAction] = useState<Action>("credit");
  const [amount, setAmount] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  // One id per open form, so a double click can't save the change twice.
  const [requestId, setRequestId] = useState(newRequestId);

  useEffect(() => {
    if (user) {
      setAction("credit");
      setAmount(null);
      setNote("");
      setRequestId(newRequestId());
    }
  }, [user]);

  const key = ["admin", "wallet", user?._id];
  const { data, isPending } = useQuery({
    queryKey: key,
    enabled: !!user,
    queryFn: () =>
      bffFetch<{ balance: number; history: { items: WalletItem[] } }>(`/api/v1/admin/wallet?userId=${user!._id}`),
  });

  const save = async () => {
    if (!user || !amount) return;
    setBusy(true);
    try {
      await bffFetch("/api/v1/admin/wallet", {
        method: "POST",
        body: JSON.stringify({ userId: user._id, action, amount, note, requestId }),
      });
      message.success("Wallet updated");
      setAmount(null);
      setNote("");
      setRequestId(newRequestId());
      await queryClient.invalidateQueries({ queryKey: key });
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={`Wallet — ${user?.name || ""}`}
      open={!!user}
      onCancel={onClose}
      onOk={save}
      okText="Save change"
      confirmLoading={busy}
      okButtonProps={{ disabled: !amount || note.trim().length < 3 }}
      width={640}
    >
      <Space orientation="vertical" style={{ width: "100%" }}>
        <Text>
          Balance: <Text strong>{isPending ? "…" : pkr(data?.balance ?? 0)}</Text>
        </Text>
        <Segmented<Action>
          value={action}
          onChange={setAction}
          options={[
            { value: "credit", label: "Add credit" },
            { value: "debit", label: "Remove credit" },
            { value: "bank_payout", label: "Paid out to bank" },
          ]}
        />
        <InputNumber min={1} style={{ width: "100%" }} prefix="PKR" placeholder="Amount" value={amount} onChange={(v) => setAmount(v)} />
        <Input
          maxLength={300}
          placeholder={action === "bank_payout" ? "e.g. Sent to Meezan account, ref 1234" : "Reason (required)"}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <Table
          size="small"
          rowKey="id"
          loading={isPending}
          pagination={false}
          dataSource={data?.history.items ?? []}
          columns={[
            { title: "When", render: (_, r: WalletItem) => when(r.date) },
            { title: "What", dataIndex: "title" },
            {
              title: "Amount",
              align: "right",
              render: (_, r: WalletItem) => (
                <Text type={r.amount < 0 ? "danger" : "success"}>
                  {r.amount < 0 ? "−" : "+"}
                  {pkr(Math.abs(r.amount))}
                </Text>
              ),
            },
          ]}
        />
      </Space>
    </Modal>
  );
}
