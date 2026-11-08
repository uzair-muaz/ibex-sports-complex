"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  App,
  Button,
  Card,
  DatePicker,
  Input,
  Modal,
  Popconfirm,
  Segmented,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminTableSkeleton } from "@/components/admin/loaders";
import { bffFetch } from "@/lib/bff/client";
import { SPORT_NAMES } from "@/lib/promo-rules";
import { DEFAULT_CLOSED_TEXT } from "@/lib/closure-rules";
import type { AdminClosure } from "@/lib/closure-admin";

const { Text } = Typography;
const when = (iso: string) =>
  new Date(iso).toLocaleString("en-PK", { timeZone: "Asia/Karachi", dateStyle: "medium", timeStyle: "short" });
const clock = (h: number) => {
  const hh = Math.floor(h) % 24;
  const mm = Math.round((h % 1) * 60);
  return `${hh % 12 === 0 ? 12 : hh % 12}:${String(mm).padStart(2, "0")} ${hh < 12 ? "AM" : "PM"}`;
};
/** A picked moment as Pakistan time, e.g. "2026-11-12T09:00:00+05:00". */
const pk = (d: Dayjs) => `${d.format("YYYY-MM-DDTHH:mm")}:00+05:00`;

type Court = { _id: string; name: string; type: string };
type Draft = {
  mode: "days" | "times";
  courtIds: string[];
  days: [Dayjs, Dayjs] | null;
  start: Dayjs | null;
  end: Dayjs | null;
  reason: string;
  publicNote: string;
};
const EMPTY: Draft = { mode: "days", courtIds: [], days: null, start: null, end: null, reason: "", publicNote: "" };

type Details = {
  closure: AdminClosure;
  bookings: {
    id: string;
    reference: string;
    date: string;
    startTime: number;
    duration: number;
    status: string;
    court: string | null;
    customer: { userId: string | null; name: string; email: string; phone: string };
    total: number;
    paid: number;
  }[];
};

/** Admin → Closures: times courts can't be booked. */
export default function ClosuresPage() {
  const { data: session } = useSession();
  const isSuperAdmin = session?.user?.role === "super_admin";
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [showPast, setShowPast] = useState(false);
  const [editing, setEditing] = useState<AdminClosure | "new" | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [detailsOf, setDetailsOf] = useState<string | null>(null);

  const key = ["admin", "closures", showPast];
  const list = useQuery({
    queryKey: key,
    queryFn: () => bffFetch<{ items: AdminClosure[] }>(`/api/v1/admin/closures${showPast ? "?past=1" : ""}`),
  });
  const courts = useQuery({ queryKey: ["courts"], queryFn: () => bffFetch<{ courts: Court[] }>("/api/v1/courts") });
  const details = useQuery({
    queryKey: ["admin", "closure", detailsOf],
    enabled: !!detailsOf,
    queryFn: () => bffFetch<Details>(`/api/v1/admin/closures/${detailsOf}`),
  });
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ["admin", "closures"] });
  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));

  const open = (c: AdminClosure | "new") => {
    setDraft(
      c === "new"
        ? EMPTY
        : { mode: "times", courtIds: c.courtIds, days: null, start: dayjs(c.startsAt), end: dayjs(c.endsAt), reason: c.reason, publicNote: c.publicNote },
    );
    setEditing(c);
  };

  // Whole days: from midnight of the first day to midnight after the last day.
  const range =
    draft.mode === "days"
      ? draft.days
        ? { startsAt: pk(draft.days[0].startOf("day")), endsAt: pk(draft.days[1].add(1, "day").startOf("day")) }
        : null
      : draft.start && draft.end
        ? { startsAt: pk(draft.start), endsAt: pk(draft.end) }
        : null;
  const canSave = !!range && draft.reason.trim().length >= 3;

  const save = async () => {
    if (!range) return;
    setBusy(true);
    try {
      const body = { courtIds: draft.courtIds, ...range, reason: draft.reason, publicNote: draft.publicNote };
      const r =
        editing === "new"
          ? await bffFetch<{ closure: AdminClosure }>("/api/v1/admin/closures", { method: "POST", body: JSON.stringify(body) })
          : await bffFetch<{ closure: AdminClosure }>(`/api/v1/admin/closures/${(editing as AdminClosure).id}`, {
              method: "PATCH",
              body: JSON.stringify(body),
            });
      const n = r.closure.affectedBookings ?? 0;
      if (n > 0) {
        message.warning(`Saved. ${n} booking${n === 1 ? " is" : "s are"} already inside this time — open it to call or cancel them.`, 8);
      } else {
        message.success("Saved. These times can't be booked now.");
      }
      setEditing(null);
      refresh();
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (c: AdminClosure) => {
    try {
      await bffFetch(`/api/v1/admin/closures/${c.id}`, { method: "DELETE" });
      message.success("Closure removed. The time can be booked again.");
      refresh();
    } catch (e) {
      message.error((e as Error).message);
    }
  };

  const courtOptions = (courts.data?.courts ?? []).map((c) => ({
    value: c._id,
    label: `${c.name} (${SPORT_NAMES[c.type] ?? c.type})`,
  }));

  return (
    <AdminLayout
      title="Closures"
      description="Times courts can't be booked — maintenance, events or a day off. Customers see the note you write."
      onRefresh={refresh}
      isLoading={list.isFetching}
      actionButton={
        isSuperAdmin && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => open("new")}>
            <span className="hidden sm:inline">Close courts</span>
          </Button>
        )
      }
    >
      <Space className="mb-3">
        <Switch size="small" checked={showPast} onChange={setShowPast} />
        <Text type="secondary">Show past closures</Text>
      </Space>
      {list.isPending ? (
        <AdminTableSkeleton columns={5} />
      ) : (
        <Card styles={{ body: { padding: 0 } }}>
          <Table
            rowKey="id"
            dataSource={list.data?.items ?? []}
            pagination={{ pageSize: 20, hideOnSinglePage: true }}
            scroll={{ x: 860 }}
            locale={{ emptyText: "No closures coming up. Courts can be booked at any time." }}
            columns={[
              {
                title: "When",
                key: "when",
                render: (_, c) => (
                  <div className="text-sm">
                    <div>{when(c.startsAt)}</div>
                    <div className="opacity-70">to {when(c.endsAt)}</div>
                  </div>
                ),
              },
              {
                title: "Courts",
                dataIndex: "courts",
                render: (names: string[], c) =>
                  c.courtIds.length ? names.map((n) => <Tag key={n}>{n}</Tag>) : <Tag color="red">All courts</Tag>,
              },
              {
                title: "Reason / customers see",
                key: "text",
                render: (_, c) => (
                  <div className="text-xs leading-5">
                    <div>{c.reason}</div>
                    <div className="opacity-70">“{c.customerText}”</div>
                  </div>
                ),
              },
              {
                title: "Bookings inside",
                key: "affected",
                render: (_, c) =>
                  new Date(c.endsAt).getTime() < Date.now() ? (
                    <Tag>Ended</Tag>
                  ) : (
                    <Button type="link" size="small" className="px-0" onClick={() => setDetailsOf(c.id)}>
                      {c.affectedBookings ? <Text type="warning">{c.affectedBookings} — see them</Text> : "None"}
                    </Button>
                  ),
              },
              ...(isSuperAdmin
                ? [
                    {
                      title: "",
                      key: "actions",
                      render: (_: unknown, c: AdminClosure) =>
                        new Date(c.endsAt).getTime() < Date.now() ? null : (
                          <Space>
                            <Button size="small" onClick={() => open(c)}>
                              Edit
                            </Button>
                            <Popconfirm title="Remove this closure? The time can be booked again." okText="Remove" onConfirm={() => remove(c)}>
                              <Button size="small" danger>
                                Remove
                              </Button>
                            </Popconfirm>
                          </Space>
                        ),
                    },
                  ]
                : []),
            ]}
          />
        </Card>
      )}

      <Modal
        title={editing === "new" ? "Close courts" : "Edit closure"}
        open={!!editing}
        onCancel={() => setEditing(null)}
        onOk={save}
        okText="Save"
        confirmLoading={busy}
        okButtonProps={{ disabled: !canSave }}
        destroyOnHidden
      >
        <div className="mt-4 flex flex-col gap-4">
          <div>
            <Text strong>Courts</Text>
            <Select
              mode="multiple"
              allowClear
              className="mt-1"
              style={{ width: "100%" }}
              placeholder="All courts (the whole venue)"
              optionFilterProp="label"
              value={draft.courtIds}
              onChange={(v) => set({ courtIds: v })}
              options={courtOptions}
            />
            <Text type="secondary" className="text-xs">
              Leave empty to close every court.
            </Text>
          </div>
          <div>
            <Segmented
              value={draft.mode}
              onChange={(v) => set({ mode: v as Draft["mode"] })}
              options={[
                { value: "days", label: "Whole days" },
                { value: "times", label: "Set times" },
              ]}
            />
            <div className="mt-2">
              {draft.mode === "days" ? (
                <DatePicker.RangePicker
                  style={{ width: "100%" }}
                  value={draft.days}
                  onChange={(v) => set({ days: v && v[0] && v[1] ? [v[0], v[1]] : null })}
                  disabledDate={(d) => d.isBefore(dayjs(), "day")}
                />
              ) : (
                <Space wrap>
                  <DatePicker
                    showTime={{ format: "h:mm A", minuteStep: 30 }}
                    format="D MMM YYYY, h:mm A"
                    placeholder="From"
                    value={draft.start}
                    onChange={(v) => set({ start: v })}
                    disabledDate={(d) => d.isBefore(dayjs(), "day")}
                  />
                  <DatePicker
                    showTime={{ format: "h:mm A", minuteStep: 30 }}
                    format="D MMM YYYY, h:mm A"
                    placeholder="To"
                    value={draft.end}
                    onChange={(v) => set({ end: v })}
                    disabledDate={(d) => d.isBefore(dayjs(), "day")}
                  />
                </Space>
              )}
            </div>
          </div>
          <div>
            <Text strong>Reason (staff only)</Text>
            <Input className="mt-1" maxLength={200} placeholder="e.g. Glass repair on Padel Court 2" value={draft.reason} onChange={(e) => set({ reason: e.target.value })} />
          </div>
          <div>
            <Text strong>Note for customers (optional)</Text>
            <Input
              className="mt-1"
              maxLength={200}
              placeholder={`e.g. Closed for maintenance. Default: “${DEFAULT_CLOSED_TEXT}”`}
              value={draft.publicNote}
              onChange={(e) => set({ publicNote: e.target.value })}
            />
          </div>
          <Alert type="info" showIcon title="Bookings already inside this time stay. After saving, open the closure to see them, then call or cancel them." />
        </div>
      </Modal>

      <Modal title="Bookings inside this closure" open={!!detailsOf} onCancel={() => setDetailsOf(null)} footer={null} width={900} destroyOnHidden>
        {details.isPending ? (
          <Text type="secondary">Loading…</Text>
        ) : details.error ? (
          <Alert type="error" showIcon title={(details.error as Error).message} />
        ) : (
          <Space orientation="vertical" className="w-full">
            <Text type="secondary">
              These bookings were made before the closure. Call the customer, then move or cancel the booking (cancelling gives the
              money back to their wallet). To tell everyone at once, use{" "}
              <Link href={`/admin/messages?closure=${detailsOf}`}>Messages</Link>.
            </Text>
            <Table
              size="small"
              rowKey="id"
              pagination={false}
              dataSource={details.data?.bookings ?? []}
              scroll={{ x: 760 }}
              locale={{ emptyText: "No bookings inside this time." }}
              columns={[
                {
                  title: "No.",
                  dataIndex: "reference",
                  render: (ref: string, b) => <Link href={`/admin/bookings/${b.id}/edit`}>{ref}</Link>,
                },
                { title: "When", key: "when", render: (_, b) => `${b.date} · ${clock(b.startTime)}–${clock(b.startTime + b.duration)}` },
                { title: "Court", dataIndex: "court" },
                {
                  title: "Customer",
                  key: "customer",
                  render: (_, b) => (
                    <div className="text-xs leading-5">
                      {b.customer.userId ? <Link href={`/admin/customers/${b.customer.userId}`}>{b.customer.name}</Link> : <>{b.customer.name} <Tag>Guest</Tag></>}
                      <div>{b.customer.phone}</div>
                      <div className="opacity-70">{b.customer.email}</div>
                    </div>
                  ),
                },
                { title: "Status", dataIndex: "status", render: (s: string) => <Tag color={s === "confirmed" ? "green" : "gold"}>{s === "confirmed" ? "Confirmed" : "Pending payment"}</Tag> },
                { title: "Paid", key: "paid", render: (_, b) => `PKR ${b.paid.toLocaleString("en-PK")} of ${b.total.toLocaleString("en-PK")}` },
              ]}
            />
          </Space>
        )}
      </Modal>
    </AdminLayout>
  );
}
