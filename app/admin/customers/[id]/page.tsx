"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  App,
  Button,
  Card,
  Descriptions,
  Empty,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Space,
  Statistic,
  Table,
  Tabs,
  Tag,
  Typography,
} from "antd";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminPageLoader } from "@/components/admin/loaders";
import { WalletModal } from "@/components/admin/WalletModal";
import { HoursBankModal } from "@/components/admin/HoursBankModal";
import { AuditTable } from "@/components/admin/AuditTable";
import { SPORT_LABELS } from "@/components/admin/MembershipPlansModal";
import { bffFetch } from "@/lib/bff/client";
import { adjustAdminLoyalty } from "@/lib/tanstack/requests/admin-ops.requests";
import type { CustomerBookingRow, CustomerPage } from "@/lib/admin-customer";

const { Text } = Typography;

const pkr = (n: number) => `PKR ${Math.round(n).toLocaleString("en-PK")}`;
const day = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-PK", { timeZone: "Asia/Karachi", dateStyle: "medium" }) : "—";
const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-PK", { timeZone: "Asia/Karachi", dateStyle: "medium", timeStyle: "short" }) : "—";
const clock = (h: number) => {
  const hh = Math.floor(h) % 24;
  const mm = Math.round((h % 1) * 60);
  return `${hh % 12 === 0 ? 12 : hh % 12}:${String(mm).padStart(2, "0")} ${hh < 12 ? "AM" : "PM"}`;
};

const STATUS: Record<CustomerBookingRow["status"], { label: string; color: string }> = {
  pending_payment: { label: "Pending payment", color: "gold" },
  confirmed: { label: "Confirmed", color: "green" },
  completed: { label: "Completed", color: "blue" },
  cancelled: { label: "Cancelled", color: "red" },
};

/** Staff: one customer on one page. */
export default function CustomerPageView() {
  const { id } = useParams<{ id: string }>();
  const { data: session } = useSession();
  const isSuperAdmin = session?.user?.role === "super_admin";
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [walletOpen, setWalletOpen] = useState(false);
  const [hoursOpen, setHoursOpen] = useState(false);
  const [pointsOpen, setPointsOpen] = useState(false);
  const [delta, setDelta] = useState<number | null>(null);
  const [pointsNote, setPointsNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const [blockReason, setBlockReason] = useState("");

  const key = ["admin", "customer", id];
  const query = useQuery({
    queryKey: key,
    enabled: !!id,
    queryFn: () => bffFetch<CustomerPage>(`/api/v1/admin/customers/${id}`),
  });
  const refresh = () => void queryClient.invalidateQueries({ queryKey: key });
  const data = query.data;
  const userRef = data ? { _id: data.customer.id, name: data.customer.name } : null;

  const savePoints = async () => {
    if (!data || !delta) return;
    setBusy(true);
    try {
      const r = await adjustAdminLoyalty({ userId: data.customer.id, delta, note: pointsNote.trim() || "Admin adjustment" });
      message.success(`Points balance is now ${r.balance.toLocaleString()}`);
      setPointsOpen(false);
      setDelta(null);
      setPointsNote("");
      refresh();
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const setBlocked = async (blocked: boolean) => {
    if (!data) return;
    setBusy(true);
    try {
      const r = await bffFetch<{ blocked: boolean; upcomingBookings?: number }>(`/api/v1/admin/customers/${data.customer.id}/block`, {
        method: "POST",
        body: JSON.stringify({ blocked, reason: blockReason }),
      });
      if (blocked) {
        message.success(
          r.upcomingBookings
            ? `Blocked. They have ${r.upcomingBookings} upcoming booking(s) — cancel them from the Bookings tab if needed.`
            : "Blocked. They can't sign in or book now.",
          8,
        );
      } else {
        message.success("Unblocked. They can sign in and book again.");
      }
      setBlockOpen(false);
      setBlockReason("");
      refresh();
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (query.isPending) return <AdminPageLoader />;

  return (
    <AdminLayout
      title={data?.customer.name ?? "Customer"}
      description={data ? data.customer.email : "Customer"}
      onRefresh={refresh}
      isLoading={query.isFetching}
    >
      {query.error || !data ? (
        <Alert type="error" showIcon title={(query.error as Error | null)?.message ?? "Customer not found"} />
      ) : (
        <Space orientation="vertical" size="large" className="w-full">
          {data.customer.blocked && (
            <Alert
              type="error"
              showIcon
              title={`Blocked on ${when(data.customer.blocked.at)}${data.customer.blocked.by ? ` by ${data.customer.blocked.by}` : ""}`}
              description={`Reason: ${data.customer.blocked.reason}. They can't sign in or book (with this account, email or phone).`}
            />
          )}
          <Card>
            <Descriptions size="small" column={{ xs: 1, sm: 2, lg: 3 }}>
              <Descriptions.Item label="Phone">{data.customer.phone || "—"}</Descriptions.Item>
              <Descriptions.Item label="City">{data.customer.city || "—"}</Descriptions.Item>
              <Descriptions.Item label="Joined">{day(data.customer.joined)}</Descriptions.Item>
              <Descriptions.Item label="Signs in with">{data.customer.signIn.join(", ") || "—"}</Descriptions.Item>
            </Descriptions>
            <Space wrap className="mt-3">
              <Button onClick={() => setWalletOpen(true)}>Wallet</Button>
              <Button onClick={() => setPointsOpen(true)}>Adjust points</Button>
              <Button onClick={() => setHoursOpen(true)}>Membership hours</Button>
              {isSuperAdmin &&
                (data.customer.blocked ? (
                  <Popconfirm title="Unblock this customer?" okText="Unblock" onConfirm={() => setBlocked(false)}>
                    <Button loading={busy}>Unblock</Button>
                  </Popconfirm>
                ) : (
                  <Button danger onClick={() => setBlockOpen(true)}>
                    Block
                  </Button>
                ))}
            </Space>
          </Card>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
            <Card size="small"><Statistic title="Bookings" value={data.stats.total} /></Card>
            <Card size="small"><Statistic title="Upcoming" value={data.stats.upcoming} /></Card>
            <Card size="small"><Statistic title="Still to pay" value={pkr(data.stats.dueTotal)} /></Card>
            <Card size="small"><Statistic title="Wallet" value={pkr(data.wallet.balance)} /></Card>
            <Card size="small">
              <Statistic title="Points" value={data.points.balance.toLocaleString()} />
              {data.points.pending > 0 && <Text type="secondary">+{data.points.pending.toLocaleString()} pending</Text>}
            </Card>
            <Card size="small">
              <Statistic
                title="Membership hours left"
                value={
                  data.membership && data.membership.status === "active"
                    ? `${data.membership.hoursBySport.reduce((s, h) => s + h.remaining, 0)} h`
                    : "—"
                }
              />
              {data.membership && <Text type="secondary">{data.membership.planName} · {data.membership.status}</Text>}
            </Card>
          </div>

          <Card styles={{ body: { paddingTop: 4 } }}>
            <Tabs
              items={[
                {
                  key: "bookings",
                  label: `Bookings (${data.bookings.length})`,
                  children: (
                    <Table
                      size="small"
                      rowKey="id"
                      dataSource={data.bookings}
                      pagination={{ pageSize: 10, hideOnSinglePage: true }}
                      scroll={{ x: 760 }}
                      columns={[
                        {
                          title: "No.",
                          dataIndex: "reference",
                          render: (ref: string, b) => (
                            <Link href={`/admin/bookings/${b.id}/edit`}>{ref}</Link>
                          ),
                        },
                        {
                          title: "When",
                          key: "when",
                          render: (_, b) => `${b.date} · ${clock(b.startTime)}–${clock(b.startTime + b.duration)}`,
                        },
                        {
                          title: "Court",
                          key: "court",
                          render: (_, b) => `${b.court ?? "—"}${b.sport ? ` (${SPORT_LABELS[b.sport] ?? b.sport})` : ""}`,
                        },
                        {
                          title: "Status",
                          dataIndex: "status",
                          render: (s: CustomerBookingRow["status"], b) => (
                            <Space size={4} wrap>
                              <Tag color={STATUS[s].color}>{STATUS[s].label}</Tag>
                              {b.guest && <Tag>Guest booking</Tag>}
                              {b.usedHours && <Tag color="purple">Hours</Tag>}
                            </Space>
                          ),
                        },
                        { title: "Total", dataIndex: "total", render: pkr },
                        { title: "Paid", dataIndex: "paid", render: pkr },
                        {
                          title: "Due / refund",
                          key: "due",
                          render: (_, b) =>
                            b.status === "cancelled"
                              ? b.refundToWallet > 0
                                ? <Text type="success">{pkr(b.refundToWallet)} to wallet</Text>
                                : "—"
                              : b.due > 0
                                ? <Text type="warning">{pkr(b.due)}</Text>
                                : "—",
                        },
                      ]}
                    />
                  ),
                },
                {
                  key: "wallet",
                  label: "Wallet",
                  children: (
                    <MoneyList
                      empty="No wallet history yet."
                      rows={data.wallet.recent.map((w) => ({ id: w.id, title: w.title, date: w.date, value: w.amount, text: `${w.amount < 0 ? "−" : "+"}${pkr(Math.abs(w.amount))}` }))}
                      footer={<Button onClick={() => setWalletOpen(true)}>Full wallet history and changes</Button>}
                    />
                  ),
                },
                {
                  key: "points",
                  label: "Points",
                  children: (
                    <MoneyList
                      empty="No points yet."
                      rows={data.points.recent.map((p) => ({
                        id: p.id,
                        title: `${p.title}${p.status === "pending" ? " (pending)" : ""}`,
                        date: p.date,
                        value: p.points,
                        text: `${p.points > 0 ? "+" : ""}${p.points.toLocaleString()}`,
                      }))}
                      footer={<Button onClick={() => setPointsOpen(true)}>Adjust points</Button>}
                    />
                  ),
                },
                {
                  key: "support",
                  label: `Support (${data.tickets.length})`,
                  children: data.tickets.length ? (
                    <Table
                      size="small"
                      rowKey="id"
                      pagination={false}
                      dataSource={data.tickets}
                      columns={[
                        { title: "Topic", dataIndex: "topic" },
                        {
                          title: "Status",
                          dataIndex: "status",
                          render: (s: string) => <Tag color={s === "open" ? "gold" : "default"}>{s}</Tag>,
                        },
                        {
                          title: "Last message",
                          key: "last",
                          render: (_, t) =>
                            t.lastMessage ? `${t.lastMessage.from === "admin" ? "IBEX: " : ""}${t.lastMessage.body}` : "—",
                        },
                        { title: "Updated", dataIndex: "updatedAt", render: when },
                      ]}
                      footer={() => <Link href="/admin/support">Reply in Support</Link>}
                    />
                  ) : (
                    <Empty description="No support tickets." />
                  ),
                },
                ...(isSuperAdmin
                  ? [
                      {
                        key: "audit",
                        label: "Staff changes",
                        children: <AuditTable compact filters={{ customerId: data.customer.id }} />,
                      },
                    ]
                  : []),
              ]}
            />
          </Card>
        </Space>
      )}

      <WalletModal
        user={walletOpen ? userRef : null}
        onClose={() => {
          setWalletOpen(false);
          refresh();
        }}
      />
      <HoursBankModal user={hoursOpen ? userRef : null} canEdit={isSuperAdmin} onClose={() => setHoursOpen(false)} onChanged={refresh} />
      <Modal
        title={`Block ${data?.customer.name ?? ""}?`}
        open={blockOpen}
        onCancel={() => setBlockOpen(false)}
        onOk={() => setBlocked(true)}
        okText="Block"
        okButtonProps={{ danger: true, disabled: blockReason.trim().length < 3 }}
        confirmLoading={busy}
      >
        <Space orientation="vertical" className="mt-4 w-full">
          <Text>
            They will be signed out of the app and can&apos;t sign in or book — on the app or website, with this account, email or
            phone. Their bookings, wallet and points stay as they are. You can unblock them any time.
          </Text>
          <Input.TextArea
            rows={2}
            maxLength={300}
            placeholder="Reason (staff only), e.g. Did not show up 3 times"
            value={blockReason}
            onChange={(e) => setBlockReason(e.target.value)}
          />
        </Space>
      </Modal>
      <Modal
        title={`Adjust points — ${data?.customer.name ?? ""}`}
        open={pointsOpen}
        onCancel={() => setPointsOpen(false)}
        onOk={savePoints}
        okText="Apply"
        confirmLoading={busy}
        okButtonProps={{ disabled: !delta }}
      >
        <Space orientation="vertical" className="mt-4 w-full">
          <Text>Current balance: {(data?.points.balance ?? 0).toLocaleString()} points</Text>
          <InputNumber
            className="w-full"
            precision={0}
            placeholder="+ to add, − to take away"
            value={delta}
            onChange={(v) => setDelta(v)}
          />
          <Input maxLength={200} placeholder="Reason (optional)" value={pointsNote} onChange={(e) => setPointsNote(e.target.value)} />
        </Space>
      </Modal>
    </AdminLayout>
  );
}

function MoneyList({
  rows,
  empty,
  footer,
}: {
  rows: { id: string; title: string; date: string | null; value: number; text: string }[];
  empty: string;
  footer: React.ReactNode;
}) {
  return (
    <Space orientation="vertical" className="w-full">
      {rows.length ? (
        <Table
          size="small"
          rowKey="id"
          pagination={false}
          dataSource={rows}
          columns={[
            { title: "When", dataIndex: "date", width: 170, render: when },
            { title: "What", dataIndex: "title" },
            {
              title: "",
              key: "value",
              align: "right",
              render: (_, r) => <Text type={r.value < 0 ? "danger" : "success"}>{r.text}</Text>,
            },
          ]}
        />
      ) : (
        <Empty description={empty} />
      )}
      <div>{footer}</div>
    </Space>
  );
}
