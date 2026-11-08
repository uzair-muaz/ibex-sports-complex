"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { Alert, Button, Card, DatePicker, Dropdown, Segmented, Space, Statistic, Table, Typography } from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminCardGridSkeleton } from "@/components/admin/loaders";
import { bffFetch } from "@/lib/bff/client";
import { SPORT_NAMES } from "@/lib/promo-rules";
import { EXPORT_KINDS, EXPORT_LABELS } from "@/lib/report-rules";
import type { Report } from "@/lib/reports";

const { Text } = Typography;
const pkr = (v: number) => `PKR ${(Math.round(v) || 0).toLocaleString("en-PK")}`;

const WALLET_REASONS: Record<string, string> = {
  booking_refund: "Refunds for cancelled bookings",
  late_payment_refund: "Payments after a booking ended",
  booking_payment: "Spent on bookings",
  admin_adjustment: "Changed by staff",
  bank_payout: "Paid out to bank",
};
const POINT_TYPES: Record<string, string> = {
  earn: "Earned from bookings",
  redeem: "Used on bookings",
  refund: "Given back (cancelled)",
  adjust: "Changed by staff",
  bonus: "Bonus",
};

type Preset = "month" | "last_month" | "30d" | "year" | "custom";
function rangeFor(p: Preset, custom: [Dayjs, Dayjs] | null): [Dayjs, Dayjs] {
  const now = dayjs();
  if (p === "last_month") return [now.subtract(1, "month").startOf("month"), now.subtract(1, "month").endOf("month")];
  if (p === "30d") return [now.subtract(29, "day"), now];
  if (p === "year") return [now.startOf("year"), now.endOf("year")];
  if (p === "custom" && custom) return custom;
  return [now.startOf("month"), now.endOf("month")];
}

type Row = { key: string; count: number; pkr: number };
const rowTable = (rows: Row[], label: (k: string) => string, opts: { countTitle?: string; pkrTitle?: string; points?: boolean } = {}) => (
  <Table<Row>
    size="small"
    rowKey="key"
    pagination={false}
    dataSource={rows}
    locale={{ emptyText: "Nothing in this period." }}
    columns={[
      { title: "", dataIndex: "key", render: label },
      { title: opts.countTitle ?? "Times", dataIndex: "count", width: 80 },
      {
        title: opts.pkrTitle ?? "PKR",
        dataIndex: "pkr",
        width: 140,
        align: "right",
        render: (v: number) => (opts.points ? v.toLocaleString("en-PK") : pkr(v)),
      },
    ]}
  />
);

/** Admin → Reports: money, wallet, points, memberships and codes, with spreadsheet downloads. */
export default function ReportsPage() {
  const { data: session } = useSession();
  const isSuperAdmin = session?.user?.role === "super_admin";
  const [preset, setPreset] = useState<Preset>("month");
  const [custom, setCustom] = useState<[Dayjs, Dayjs] | null>(null);
  const [from, to] = rangeFor(preset, custom).map((d) => d.format("YYYY-MM-DD"));

  const report = useQuery({
    queryKey: ["admin", "report", from, to],
    enabled: isSuperAdmin,
    queryFn: () => bffFetch<Report>(`/api/v1/admin/reports?from=${from}&to=${to}`),
  });
  const r = report.data;

  const download = (kind: string) => {
    window.location.href = `/api/v1/admin/reports/export?kind=${kind}&from=${from}&to=${to}`;
  };

  if (session && !isSuperAdmin) {
    return (
      <AdminLayout title="Reports" description="Money and customer reports">
        <Alert type="info" showIcon title="Only the super admin can see reports." />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title="Reports"
      description="Money, wallet, points, memberships and codes for a period. Bookings count by game day."
      onRefresh={() => void report.refetch()}
      isLoading={report.isFetching}
      actionButton={
        <Dropdown
          menu={{ items: EXPORT_KINDS.map((k) => ({ key: k, label: EXPORT_LABELS[k] })), onClick: ({ key }) => download(key) }}
        >
          <Button icon={<DownloadOutlined />}>
            <span className="hidden sm:inline">Download spreadsheet</span>
          </Button>
        </Dropdown>
      }
    >
      <Space wrap className="mb-4">
        <Segmented<Preset>
          value={preset}
          onChange={setPreset}
          options={[
            { value: "month", label: "This month" },
            { value: "last_month", label: "Last month" },
            { value: "30d", label: "Last 30 days" },
            { value: "year", label: "This year" },
            { value: "custom", label: "Pick dates" },
          ]}
        />
        {preset === "custom" && (
          <DatePicker.RangePicker value={custom} onChange={(v) => setCustom(v && v[0] && v[1] ? [v[0], v[1]] : null)} />
        )}
        <Text type="secondary">
          {dayjs(from).format("D MMM YYYY")} – {dayjs(to).format("D MMM YYYY")}
        </Text>
      </Space>

      {report.error ? (
        <Alert type="error" showIcon title={(report.error as Error).message} />
      ) : !r ? (
        <AdminCardGridSkeleton count={6} columns={3} />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
            <Card size="small"><Statistic title="Bookings" value={r.bookings.count} /></Card>
            <Card size="small"><Statistic title="Booked value" value={pkr(r.bookings.total)} /></Card>
            <Card size="small"><Statistic title="Received" value={pkr(r.bookings.received)} /></Card>
            <Card size="small"><Statistic title="Still to pay" value={pkr(r.bookings.due)} /></Card>
            <Card size="small"><Statistic title="Membership sales" value={pkr(r.memberships.revenue)} /></Card>
            <Card size="small"><Statistic title="Wallet money held now" value={pkr(r.wallet.balanceNow)} /></Card>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Card title="Where the booking money came from" size="small">
              <Table
                size="small"
                rowKey="label"
                pagination={false}
                showHeader={false}
                dataSource={[
                  { label: "Court fees (before anything off)", value: r.bookings.courtFees },
                  { label: "− Automatic discounts", value: -r.bookings.autoDiscounts },
                  { label: "− Promo codes", value: -r.bookings.promo },
                  { label: "− Points used", value: -r.bookings.points },
                  { label: "− Membership hours", value: -r.bookings.hours },
                  { label: "= Booked value", value: r.bookings.total, strong: true },
                  { label: "Cash", value: r.bookings.cash },
                  { label: "Online (bank transfer)", value: r.bookings.online },
                  ...(r.bookings.unsplit ? [{ label: "Paid (older bookings, not split)", value: r.bookings.unsplit }] : []),
                  { label: "Wallet used", value: r.bookings.wallet },
                  { label: "Still to pay", value: r.bookings.due, strong: true },
                ]}
                columns={[
                  { dataIndex: "label", render: (v: string, row) => (row.strong ? <Text strong>{v}</Text> : v) },
                  { dataIndex: "value", align: "right", render: (v: number, row) => (row.strong ? <Text strong>{pkr(v)}</Text> : pkr(v)) },
                ]}
              />
              <Text type="secondary" className="mt-2 block text-xs">
                Cancelled: {r.bookings.cancelled.count} booking(s) · {pkr(r.bookings.cancelled.toWallet)} back to wallets ·{" "}
                {pkr(r.bookings.cancelled.paidBack)} paid back in cash or bank.
              </Text>
            </Card>

            <Card title="By sport" size="small">
              <Table
                size="small"
                rowKey="sport"
                pagination={false}
                dataSource={r.bookings.bySport}
                locale={{ emptyText: "No bookings in this period." }}
                columns={[
                  { title: "Sport", dataIndex: "sport", render: (s: string) => SPORT_NAMES[s] ?? s },
                  { title: "Bookings", dataIndex: "count" },
                  { title: "Hours", dataIndex: "hours" },
                  { title: "Booked", dataIndex: "total", align: "right", render: pkr },
                  { title: "Received", dataIndex: "received", align: "right", render: pkr },
                ]}
              />
              <div className="mt-3">{rowTable(r.bookings.bySource, (k) => (k === "app" ? "Booked in the app" : "Booked on the website"), { countTitle: "Bookings", pkrTitle: "Booked" })}</div>
            </Card>

            <Card title="Discounts and promo codes" size="small">
              <Text strong>Automatic discounts</Text>
              {rowTable(r.bookings.autoDiscountUse, (k) => k, { pkrTitle: "PKR off" })}
              <Text strong className="mt-3 block">Promo codes</Text>
              {rowTable(r.bookings.promoUse, (k) => k, { pkrTitle: "PKR off" })}
            </Card>

            <Card title="Memberships" size="small">
              <Space size="large" className="mb-3">
                <Statistic title="Sold in period" value={r.memberships.sold} />
                <Statistic title="Paid" value={pkr(r.memberships.revenue)} />
                <Statistic title="Active now" value={r.memberships.activeNow} />
                <Statistic title="Hours used" value={r.bookings.hoursUsed} />
              </Space>
              {rowTable(r.memberships.byPlan, (k) => k, { countTitle: "Sold", pkrTitle: "Paid" })}
              <div className="mt-3">{rowTable(r.memberships.byMethod, (k) => k, { countTitle: "Sold", pkrTitle: "Paid" })}</div>
            </Card>

            <Card title="Wallet" size="small">
              <Space size="large" className="mb-3">
                <Statistic title="Held now" value={pkr(r.wallet.balanceNow)} />
                <Statistic title="Customers with money" value={r.wallet.customersWithBalance} />
                <Statistic title="In (period)" value={pkr(r.wallet.creditedTotal)} />
                <Statistic title="Out (period)" value={pkr(r.wallet.debitedTotal)} />
              </Space>
              <Text strong>Money in</Text>
              {rowTable(r.wallet.credited, (k) => WALLET_REASONS[k] ?? k)}
              <Text strong className="mt-3 block">Money out</Text>
              {rowTable(r.wallet.debited, (k) => WALLET_REASONS[k] ?? k)}
            </Card>

            <Card title="Reward points" size="small">
              <Space size="large" className="mb-3">
                <Statistic title="Points held now" value={r.points.balanceNow.toLocaleString("en-PK")} />
                <Statistic title="Worth" value={pkr(r.points.balanceNow * r.points.pkrPerPoint)} />
                <Statistic title="Customers with points" value={r.points.customersWithPoints} />
              </Space>
              {rowTable(r.points.byType, (k) => POINT_TYPES[k] ?? k, { pkrTitle: "Points", points: true })}
            </Card>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
