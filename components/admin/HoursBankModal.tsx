"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  App,
  Button,
  DatePicker,
  Descriptions,
  Empty,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Segmented,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import type { Dayjs } from "dayjs";
import { bffFetch } from "@/lib/bff/client";
import { SPORT_LABELS } from "@/components/admin/MembershipPlansModal";
import { PAYMENT_METHOD_LABELS, type MembershipPaymentMethod } from "@/lib/membership-payment";
import type { HoursHistoryItem, HoursHistoryType } from "@/lib/membership-admin";

const { Text } = Typography;

type MembershipView = {
  id: string;
  planName: string;
  status: "active" | "expired" | "cancelled";
  validFrom: string | null;
  validUntil: string | null;
  hoursBySport: { sport: string; total: number; used: number; remaining: number }[];
  pricePaid: number | null;
  paymentMethod: MembershipPaymentMethod | null;
  paymentNote: string;
  activatedBy: string | null;
  cancelledAt: string | null;
};

type Tab = "hours" | "date" | "cancel";

const TYPE_LABELS: Record<HoursHistoryType, string> = {
  activated: "Plan activated",
  carried_over: "Carried over",
  added: "Hours added",
  removed: "Hours removed",
  used: "Used for booking",
  returned: "Booking cancelled",
  extended: "End date changed",
  cancelled: "Plan cancelled",
};

const STATUS_COLORS = { active: "green", expired: "default", cancelled: "red" } as const;

const day = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-PK", { timeZone: "Asia/Karachi", dateStyle: "medium" }) : "—";
const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-PK", { timeZone: "Asia/Karachi", dateStyle: "medium", timeStyle: "short" }) : "—";
const hrs = (n: number) => `${n} h`;
const newRequestId = () => crypto.randomUUID();

/** One customer's membership hours: what's left, the history, and (super admin) changes. */
export function HoursBankModal({
  user,
  canEdit,
  onClose,
  onChanged,
}: {
  user: { _id: string; name?: string } | null;
  /** Super admin only. */
  canEdit: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("hours");
  const [sport, setSport] = useState<string>();
  const [direction, setDirection] = useState<"add" | "remove">("add");
  const [hours, setHours] = useState<number | null>(null);
  const [endDate, setEndDate] = useState<Dayjs | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  // One id per open form, so a double click can't add the hours twice.
  const [requestId, setRequestId] = useState(newRequestId);

  const resetForm = () => {
    setHours(null);
    setEndDate(null);
    setNote("");
    setRequestId(newRequestId());
  };

  useEffect(() => {
    if (user) {
      setTab("hours");
      setSport(undefined);
      setDirection("add");
      resetForm();
    }
  }, [user]);

  const key = ["admin", "hours-bank", user?._id];
  const { data, isPending, error } = useQuery({
    queryKey: key,
    enabled: !!user,
    queryFn: () =>
      bffFetch<{ memberships: MembershipView[]; history: HoursHistoryItem[] }>(
        `/api/v1/admin/memberships?userId=${user!._id}`,
      ),
  });

  const current = data?.memberships.find((m) => m.status !== "cancelled") ?? data?.memberships[0] ?? null;
  const isActive = current?.status === "active";
  const sportRow = current?.hoursBySport.find((h) => h.sport === sport);
  const noteOk = note.trim().length >= 3;

  const send = async (body: Record<string, unknown>, done: string) => {
    if (!current) return;
    setBusy(true);
    try {
      await bffFetch(`/api/v1/admin/memberships/${current.id}`, { method: "POST", body: JSON.stringify(body) });
      message.success(done);
      resetForm();
      await queryClient.invalidateQueries({ queryKey: key });
      onChanged();
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const saveHours = () =>
    hours &&
    sport &&
    send(
      { action: "adjust-hours", sport, hours: direction === "add" ? hours : -hours, note, requestId },
      direction === "add" ? "Hours added" : "Hours removed",
    );

  const saveDate = () =>
    endDate &&
    send(
      // End of the chosen day, Pakistan time.
      { action: "change-end-date", validUntil: `${endDate.format("YYYY-MM-DD")}T23:59:59+05:00`, note },
      "End date changed",
    );

  const cancelPlan = () => send({ action: "cancel", note }, "Membership cancelled");

  return (
    <Modal
      title={`Hours bank — ${user?.name || ""}`}
      open={!!user}
      onCancel={onClose}
      footer={null}
      width={820}
      destroyOnHidden
    >
      {error ? (
        <Alert type="error" showIcon title={(error as Error).message} />
      ) : isPending ? (
        <Text type="secondary">Loading…</Text>
      ) : !current ? (
        <Empty description="No membership yet. Use Activate to give this customer a plan." />
      ) : (
        <Space orientation="vertical" size="large" className="w-full">
          <Descriptions size="small" column={{ xs: 1, sm: 2 }} bordered>
            <Descriptions.Item label="Plan">
              {current.planName} <Tag color={STATUS_COLORS[current.status]}>{current.status}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Valid">
              {day(current.validFrom)} – {day(current.validUntil)}
            </Descriptions.Item>
            <Descriptions.Item label="Paid">
              {current.paymentMethod
                ? `${current.paymentMethod === "free" ? "" : `PKR ${(current.pricePaid ?? 0).toLocaleString("en-PK")} · `}${PAYMENT_METHOD_LABELS[current.paymentMethod]}`
                : "Not recorded"}
              {current.paymentNote ? ` (${current.paymentNote})` : ""}
            </Descriptions.Item>
            <Descriptions.Item label="Activated by">{current.activatedBy ?? "—"}</Descriptions.Item>
          </Descriptions>

          <Table
            size="small"
            rowKey="sport"
            pagination={false}
            dataSource={current.hoursBySport}
            columns={[
              { title: "Sport", dataIndex: "sport", render: (s: string) => SPORT_LABELS[s] ?? s },
              { title: "Total", dataIndex: "total", render: hrs },
              { title: "Used", dataIndex: "used", render: hrs },
              { title: "Left", dataIndex: "remaining", render: (n: number) => <Text strong>{hrs(n)}</Text> },
            ]}
          />

          {canEdit && current.status !== "cancelled" && (
            <div className="rounded-lg border border-gray-200 p-4">
              <Segmented<Tab>
                value={tab}
                onChange={(v) => {
                  setTab(v);
                  resetForm();
                }}
                options={[
                  { value: "hours", label: "Add or remove hours" },
                  { value: "date", label: "Change end date" },
                  { value: "cancel", label: "Cancel plan" },
                ]}
              />
              <div className="mt-4 flex flex-col gap-3">
                {tab === "hours" &&
                  (isActive ? (
                    <Space wrap>
                      <Segmented
                        value={direction}
                        onChange={(v) => setDirection(v as "add" | "remove")}
                        options={[
                          { value: "add", label: "Add" },
                          { value: "remove", label: "Remove" },
                        ]}
                      />
                      <Select
                        placeholder="Sport"
                        value={sport}
                        onChange={setSport}
                        style={{ width: 150 }}
                        options={Object.entries(SPORT_LABELS).map(([value, label]) => ({ value, label }))}
                      />
                      <InputNumber
                        min={0.5}
                        max={direction === "remove" ? (sportRow?.remaining ?? 0) || 0.5 : 500}
                        step={0.5}
                        placeholder="Hours"
                        value={hours}
                        onChange={(v) => setHours(v)}
                        suffix="hours"
                        style={{ width: 160 }}
                      />
                      {direction === "remove" && sport && (
                        <Text type="secondary">{hrs(sportRow?.remaining ?? 0)} left</Text>
                      )}
                    </Space>
                  ) : (
                    <Alert type="info" showIcon title="This plan has ended. Change the end date first, or activate a new plan." />
                  ))}
                {tab === "date" && (
                  <Space wrap>
                    <DatePicker
                      value={endDate}
                      onChange={setEndDate}
                      disabledDate={(d) => d.isBefore(new Date(), "day")}
                      placeholder="New end date"
                    />
                    <Text type="secondary">Now ends {day(current.validUntil)}</Text>
                  </Space>
                )}
                {tab === "cancel" && (
                  <Alert
                    type="warning"
                    showIcon
                    title="Cancelling stops the plan now. Hours left can't be used. Bookings already made stay."
                  />
                )}
                {(tab !== "hours" || isActive) && (
                  <>
                    <Input.TextArea
                      rows={2}
                      maxLength={300}
                      placeholder="Reason (shown in the history)"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                    />
                    <div>
                      {tab === "hours" && (
                        <Button type="primary" loading={busy} disabled={!sport || !hours || !noteOk} onClick={saveHours}>
                          {direction === "add" ? "Add hours" : "Remove hours"}
                        </Button>
                      )}
                      {tab === "date" && (
                        <Button type="primary" loading={busy} disabled={!endDate || !noteOk} onClick={saveDate}>
                          Save end date
                        </Button>
                      )}
                      {tab === "cancel" && (
                        <Popconfirm title="Cancel this membership now?" okText="Yes, cancel it" onConfirm={cancelPlan}>
                          <Button danger loading={busy} disabled={!noteOk}>
                            Cancel membership
                          </Button>
                        </Popconfirm>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
          {!canEdit && <Text type="secondary">Only the super admin can change hours, dates or cancel a plan.</Text>}

          <div>
            <Text strong>History</Text>
            <Table
              className="mt-2"
              size="small"
              rowKey="id"
              dataSource={data?.history ?? []}
              pagination={{ pageSize: 10, hideOnSinglePage: true }}
              scroll={{ x: 640 }}
              columns={[
                { title: "When", dataIndex: "date", width: 150, render: when },
                {
                  title: "What",
                  key: "what",
                  render: (_, r) => (
                    <>
                      {TYPE_LABELS[r.type]}
                      {r.sport ? ` · ${SPORT_LABELS[r.sport] ?? r.sport}` : ""}
                    </>
                  ),
                },
                {
                  title: "Hours",
                  dataIndex: "hours",
                  width: 80,
                  render: (n: number) =>
                    n === 0 ? "—" : <Text type={n < 0 ? "danger" : "success"}>{n > 0 ? `+${n}` : n}</Text>,
                },
                { title: "Left after", dataIndex: "remainingAfter", width: 90, render: (n: number | null) => (n === null ? "—" : hrs(n)) },
                {
                  title: "Details",
                  key: "details",
                  render: (_, r) => (
                    <>
                      {r.bookingRef ? `${r.bookingRef} · ` : ""}
                      {r.note}
                      {r.validUntil ? ` → ends ${day(r.validUntil)}` : ""}
                    </>
                  ),
                },
                { title: "By", dataIndex: "by", width: 110, render: (v: string | null) => v ?? "—" },
              ]}
            />
          </div>
        </Space>
      )}
    </Modal>
  );
}
