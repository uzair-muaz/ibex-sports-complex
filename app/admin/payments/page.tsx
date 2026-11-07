"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { App, Button, Card, Input, InputNumber, Modal, Segmented, Space, Table, Tag, Typography, Upload } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { UploadFile } from "antd/es/upload/interface";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminTableSkeleton } from "@/components/admin/loaders";
import { bffFetch } from "@/lib/bff/client";
import type { AdminProofRow } from "@/lib/payments/admin-proofs";

const { Text } = Typography;
type Status = "submitted" | "verified" | "rejected";

const pkr = (n: number | null | undefined) => `PKR ${Math.round(n ?? 0).toLocaleString("en-PK")}`;
const when = (iso: string | null | undefined) =>
  iso
    ? new Date(iso).toLocaleString("en-PK", { timeZone: "Asia/Karachi", dateStyle: "medium", timeStyle: "short" })
    : "—";

async function postForm(path: string, form: FormData) {
  const res = await fetch(path, { method: "POST", body: form, credentials: "include" });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { error?: string }).error || `Request failed (${res.status})`);
  return body;
}

export default function AdminPaymentsPage() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<Status>("submitted");
  const [verifying, setVerifying] = useState<AdminProofRow | null>(null);
  const [verifyAmount, setVerifyAmount] = useState<number | null>(null);
  const [rejecting, setRejecting] = useState<AdminProofRow | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [waOpen, setWaOpen] = useState(false);
  const [waRef, setWaRef] = useState("");
  const [waAmount, setWaAmount] = useState<number | null>(null);
  const [waNote, setWaNote] = useState("");
  const [waFiles, setWaFiles] = useState<UploadFile[]>([]);

  const { data, isPending, isFetching, refetch } = useQuery({
    queryKey: ["admin", "payment-proofs", status],
    queryFn: () => bffFetch<{ proofs: AdminProofRow[] }>(`/api/v1/admin/payment-proofs?status=${status}`),
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin", "payment-proofs"] });

  const doVerify = async () => {
    if (!verifying || !verifyAmount) return;
    setBusy(true);
    try {
      await bffFetch(`/api/v1/admin/payment-proofs/${verifying.id}/verify`, {
        method: "POST",
        body: JSON.stringify({ amount: verifyAmount }),
      });
      message.success("Payment verified");
      setVerifying(null);
      await refresh();
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const doReject = async () => {
    if (!rejecting) return;
    setBusy(true);
    try {
      await bffFetch(`/api/v1/admin/payment-proofs/${rejecting.id}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      });
      message.success("Screenshot rejected");
      setRejecting(null);
      await refresh();
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const doWhatsApp = async () => {
    setBusy(true);
    try {
      const form = new FormData();
      form.set("bookingReference", waRef);
      form.set("amount", String(waAmount ?? ""));
      form.set("note", waNote);
      const file = waFiles[0]?.originFileObj;
      if (file) form.set("file", file);
      await postForm("/api/v1/admin/payment-proofs", form);
      message.success("Payment added");
      setWaOpen(false);
      setWaRef("");
      setWaAmount(null);
      setWaNote("");
      setWaFiles([]);
      await refresh();
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const columns: ColumnsType<AdminProofRow> = [
    {
      title: "Booking",
      render: (_, r) =>
        r.booking ? (
          <div>
            <Text strong>{r.booking.reference}</Text>
            <div>
              <Text type="secondary">
                {r.booking.courtName} · {when(r.booking.start)}
              </Text>
            </div>
            {r.booking.status === "cancelled" && <Tag color="red">Cancelled</Tag>}
          </div>
        ) : (
          <Text type="secondary">Booking deleted</Text>
        ),
    },
    {
      title: "Customer",
      render: (_, r) =>
        r.booking ? (
          <div>
            {r.booking.customerName}
            <div>
              <Text type="secondary">{r.booking.customerPhone}</Text>
            </div>
          </div>
        ) : null,
    },
    {
      title: "Sent",
      render: (_, r) => (
        <div>
          <Text strong>{pkr(r.amount)}</Text>
          {r.transferReference && (
            <div>
              <Text type="secondary">Ref {r.transferReference}</Text>
            </div>
          )}
          <div>
            <Text type="secondary">{when(r.submittedAt)}</Text>
          </div>
          {r.source === "whatsapp" && <Tag>WhatsApp</Tag>}
        </div>
      ),
    },
    {
      title: "Advance / verified so far",
      render: (_, r) =>
        r.booking ? (
          <Text>
            {pkr(r.booking.advanceRequired)} / {pkr(r.booking.amountVerified)}
            <div>
              <Text type="secondary">Total {pkr(r.booking.total)}</Text>
            </div>
          </Text>
        ) : null,
    },
    {
      title: "Screenshot",
      render: (_, r) =>
        r.imageUrl ? (
          <a href={r.imageUrl} target="_blank" rel="noreferrer">
            Open {r.fileType?.toUpperCase()}
          </a>
        ) : (
          <Text type="secondary">None</Text>
        ),
    },
    {
      title: status === "submitted" ? "Action" : "Result",
      render: (_, r) =>
        status === "submitted" ? (
          <Space>
            <Button
              type="primary"
              onClick={() => {
                setVerifying(r);
                setVerifyAmount(r.amount);
              }}
            >
              Verify
            </Button>
            <Button
              danger
              onClick={() => {
                setRejecting(r);
                setReason("");
              }}
            >
              Reject
            </Button>
          </Space>
        ) : status === "verified" ? (
          <Tag color="green">Verified {pkr(r.verifiedAmount)}</Tag>
        ) : (
          <Text type="secondary">{r.rejectionReason}</Text>
        ),
    },
  ];

  return (
    <AdminLayout
      title="Payments"
      description="Bank transfer screenshots from the app. Check your bank, then verify or reject."
      onRefresh={() => void refetch()}
      isLoading={isFetching}
    >
      <Space wrap className="mb-4">
        <Segmented<Status>
          value={status}
          onChange={setStatus}
          options={[
            { value: "submitted", label: "Waiting to check" },
            { value: "verified", label: "Verified" },
            { value: "rejected", label: "Rejected" },
          ]}
        />
        <Button onClick={() => setWaOpen(true)}>Add WhatsApp payment</Button>
      </Space>

      {isPending ? (
        <AdminTableSkeleton />
      ) : (
        <Card styles={{ body: { padding: 0 } }}>
          <Table rowKey="id" columns={columns} dataSource={data?.proofs ?? []} pagination={{ pageSize: 20 }} scroll={{ x: true }} />
        </Card>
      )}

      <Modal
        title={`Verify ${verifying?.booking?.reference ?? ""}`}
        open={!!verifying}
        onCancel={() => setVerifying(null)}
        onOk={doVerify}
        okText="Verify"
        confirmLoading={busy}
        okButtonProps={{ disabled: !verifyAmount }}
      >
        <p>Enter the amount that actually arrived in the bank account.</p>
        <InputNumber min={1} style={{ width: "100%" }} prefix="PKR" value={verifyAmount} onChange={(v) => setVerifyAmount(v)} />
        <p className="mt-2">
          <Text type="secondary">
            The booking is confirmed automatically once verified money reaches the advance.
          </Text>
        </p>
      </Modal>

      <Modal
        title={`Reject ${rejecting?.booking?.reference ?? ""}`}
        open={!!rejecting}
        onCancel={() => setRejecting(null)}
        onOk={doReject}
        okText="Reject"
        okButtonProps={{ danger: true, disabled: reason.trim().length < 3 }}
        confirmLoading={busy}
      >
        <p>The customer sees this reason and can send a new screenshot.</p>
        <Input.TextArea rows={3} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Amount not received" />
      </Modal>

      <Modal
        title="Add a payment sent on WhatsApp"
        open={waOpen}
        onCancel={() => setWaOpen(false)}
        onOk={doWhatsApp}
        okText="Add as verified"
        confirmLoading={busy}
        okButtonProps={{ disabled: !waRef.trim() || !waAmount }}
      >
        <Space direction="vertical" style={{ width: "100%" }}>
          <Input placeholder="Booking reference, e.g. IBX-2109" value={waRef} onChange={(e) => setWaRef(e.target.value)} />
          <InputNumber min={1} style={{ width: "100%" }} prefix="PKR" placeholder="Amount that arrived" value={waAmount} onChange={(v) => setWaAmount(v)} />
          <Input placeholder="Note (optional)" maxLength={300} value={waNote} onChange={(e) => setWaNote(e.target.value)} />
          <Upload
            accept=".jpg,.jpeg,.png,.pdf"
            maxCount={1}
            fileList={waFiles}
            beforeUpload={() => false}
            onChange={({ fileList }) => setWaFiles(fileList)}
          >
            <Button>Attach screenshot (optional)</Button>
          </Upload>
        </Space>
      </Modal>
    </AdminLayout>
  );
}
