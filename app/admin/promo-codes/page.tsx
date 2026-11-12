"use client";

import { useSportList } from "@/lib/tanstack/hooks/queries";
import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  App,
  Button,
  Card,
  Checkbox,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Segmented,
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
import type { AdminPromo } from "@/lib/promo-admin";

const { Text } = Typography;
const pkr = (n: number) => `PKR ${Math.round(n).toLocaleString("en-PK")}`;
const day = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-PK", { timeZone: "Asia/Karachi", dateStyle: "medium" }) : null;
const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-PK", { timeZone: "Asia/Karachi", dateStyle: "medium", timeStyle: "short" }) : "—";

type Draft = {
  code: string;
  description: string;
  type: "percentage" | "fixed";
  value: number | null;
  maxDiscountPkr: number | null;
  minFeePkr: number | null;
  sports: string[];
  validFrom: Dayjs | null;
  validUntil: Dayjs | null;
  maxUses: number | null;
  maxUsesPerCustomer: number | null;
  newCustomersOnly: boolean;
  isActive: boolean;
};

const EMPTY: Draft = {
  code: "",
  description: "",
  type: "percentage",
  value: null,
  maxDiscountPkr: null,
  minFeePkr: null,
  sports: [],
  validFrom: null,
  validUntil: null,
  maxUses: null,
  maxUsesPerCustomer: 1,
  newCustomersOnly: false,
  isActive: true,
};

const toDraft = (p: AdminPromo): Draft => ({
  code: p.code,
  description: p.description,
  type: p.type,
  value: p.value,
  maxDiscountPkr: p.maxDiscountPkr,
  minFeePkr: p.minFeePkr,
  sports: p.sports,
  validFrom: p.validFrom ? dayjs(p.validFrom) : null,
  validUntil: p.validUntil ? dayjs(p.validUntil) : null,
  maxUses: p.maxUses,
  maxUsesPerCustomer: p.maxUsesPerCustomer,
  newCustomersOnly: p.newCustomersOnly,
  isActive: p.isActive,
});

function offText(p: Pick<AdminPromo, "type" | "value" | "maxDiscountPkr">) {
  if (p.type === "fixed") return `${pkr(p.value)} off`;
  return `${p.value}% off${p.maxDiscountPkr ? ` (up to ${pkr(p.maxDiscountPkr)})` : ""}`;
}

function statusOf(p: AdminPromo): { label: string; color: string } {
  const now = Date.now();
  if (!p.isActive) return { label: "Off", color: "default" };
  if (p.validUntil && new Date(p.validUntil).getTime() < now) return { label: "Expired", color: "red" };
  if (p.validFrom && new Date(p.validFrom).getTime() > now) return { label: "Starts later", color: "blue" };
  if (p.maxUses && p.usedCount >= p.maxUses) return { label: "Used up", color: "orange" };
  return { label: "Live", color: "green" };
}

export default function PromoCodesPage() {
  const { data: session } = useSession();
  // Sports from Admin → App Settings.
  const sportList = useSportList();
  const isSuperAdmin = session?.user?.role === "super_admin";
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<AdminPromo | "new" | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [usesOf, setUsesOf] = useState<AdminPromo | null>(null);

  const key = ["admin", "promo-codes"];
  const list = useQuery({ queryKey: key, queryFn: () => bffFetch<{ items: AdminPromo[] }>("/api/v1/admin/promo-codes") });
  const uses = useQuery({
    queryKey: ["admin", "promo-uses", usesOf?.id],
    enabled: !!usesOf,
    queryFn: () =>
      bffFetch<{
        uses: { id: string; bookingId: string | null; bookingRef: string | null; customer: string; userId: string | null; discountPkr: number; status: string; date: string | null }[];
      }>(`/api/v1/admin/promo-codes/${usesOf!.id}`),
  });
  const refresh = () => void queryClient.invalidateQueries({ queryKey: key });

  const open = (p: AdminPromo | "new") => {
    setDraft(p === "new" ? EMPTY : toDraft(p));
    setEditing(p);
  };
  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));

  const save = async () => {
    setBusy(true);
    try {
      const body = {
        ...draft,
        code: draft.code.trim().toUpperCase(),
        description: draft.description.trim(),
        maxDiscountPkr: draft.type === "percentage" ? draft.maxDiscountPkr : null,
        // Whole days, Pakistan time.
        validFrom: draft.validFrom ? `${draft.validFrom.format("YYYY-MM-DD")}T00:00:00+05:00` : null,
        validUntil: draft.validUntil ? `${draft.validUntil.format("YYYY-MM-DD")}T23:59:59+05:00` : null,
        maxUsesPerCustomer: draft.maxUsesPerCustomer ?? 0,
      };
      if (editing === "new") {
        await bffFetch("/api/v1/admin/promo-codes", { method: "POST", body: JSON.stringify(body) });
        message.success("Promo code created");
      } else if (editing) {
        await bffFetch(`/api/v1/admin/promo-codes/${editing.id}`, { method: "PATCH", body: JSON.stringify(body) });
        message.success("Promo code saved");
      }
      setEditing(null);
      refresh();
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (p: AdminPromo, isActive: boolean) => {
    try {
      await bffFetch(`/api/v1/admin/promo-codes/${p.id}`, { method: "PATCH", body: JSON.stringify({ isActive }) });
      refresh();
    } catch (e) {
      message.error((e as Error).message);
    }
  };

  const remove = async (p: AdminPromo) => {
    try {
      await bffFetch(`/api/v1/admin/promo-codes/${p.id}`, { method: "DELETE" });
      message.success("Promo code deleted");
      refresh();
    } catch (e) {
      message.error((e as Error).message);
    }
  };

  const canSave = draft.code.trim().length >= 3 && !!draft.value;
  const editingPromo = editing && editing !== "new" ? editing : null;
  const nameLocked = !!editingPromo && editingPromo.usedCount > 0;

  return (
    <AdminLayout
      title="Promo codes"
      description="Codes customers type in at booking. They come off the court fee after automatic discounts."
      onRefresh={refresh}
      isLoading={list.isFetching}
      actionButton={
        isSuperAdmin && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => open("new")}>
            <span className="hidden sm:inline">Add promo code</span>
          </Button>
        )
      }
    >
      {list.isPending ? (
        <AdminTableSkeleton columns={6} />
      ) : (
        <Card styles={{ body: { padding: 0 } }}>
          <Table
            rowKey="id"
            dataSource={list.data?.items ?? []}
            pagination={{ pageSize: 20, hideOnSinglePage: true }}
            scroll={{ x: 900 }}
            locale={{ emptyText: isSuperAdmin ? "No promo codes yet. Use Add promo code." : "No promo codes yet." }}
            columns={[
              {
                title: "Code",
                dataIndex: "code",
                render: (code: string, p) => (
                  <div>
                    <Text strong copyable>{code}</Text>
                    {p.description && <div className="text-xs opacity-70">{p.description}</div>}
                  </div>
                ),
              },
              { title: "Discount", key: "off", render: (_, p) => offText(p) },
              {
                title: "Rules",
                key: "rules",
                render: (_, p) => (
                  <div className="text-xs leading-5">
                    <div>{p.sports.length ? p.sports.map((s) => SPORT_NAMES[s] ?? s).join(", ") : "All sports"}</div>
                    {p.minFeePkr && <div>Court fee from {pkr(p.minFeePkr)}</div>}
                    <div>{p.maxUsesPerCustomer ? `${p.maxUsesPerCustomer}× per customer` : "No limit per customer"}</div>
                    {p.newCustomersOnly && <div>First booking only</div>}
                  </div>
                ),
              },
              {
                title: "Valid",
                key: "valid",
                render: (_, p) =>
                  p.validFrom || p.validUntil ? `${day(p.validFrom) ?? "Now"} – ${day(p.validUntil) ?? "no end"}` : "Always",
              },
              {
                title: "Used",
                key: "used",
                render: (_, p) => (
                  <Button type="link" size="small" className="px-0" onClick={() => setUsesOf(p)}>
                    {p.usedCount}
                    {p.maxUses ? ` / ${p.maxUses}` : ""} · {pkr(p.totalDiscountPkr)} off
                  </Button>
                ),
              },
              {
                title: "Status",
                key: "status",
                render: (_, p) => {
                  const st = statusOf(p);
                  return (
                    <Space>
                      {isSuperAdmin && <Switch size="small" checked={p.isActive} onChange={(v) => toggle(p, v)} />}
                      <Tag color={st.color}>{st.label}</Tag>
                    </Space>
                  );
                },
              },
              ...(isSuperAdmin
                ? [
                    {
                      title: "",
                      key: "actions",
                      align: "right" as const,
                      render: (_: unknown, p: AdminPromo) => (
                        <Space>
                          <Button size="small" onClick={() => open(p)}>
                            Edit
                          </Button>
                          {p.usedCount === 0 && (
                            <Popconfirm title={`Delete ${p.code}?`} okText="Delete" okButtonProps={{ danger: true }} onConfirm={() => remove(p)}>
                              <Button size="small" danger>
                                Delete
                              </Button>
                            </Popconfirm>
                          )}
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
        title={editingPromo ? `Edit ${editingPromo.code}` : "Add promo code"}
        open={!!editing}
        onCancel={() => setEditing(null)}
        onOk={save}
        okText="Save"
        confirmLoading={busy}
        okButtonProps={{ disabled: !canSave }}
        width={640}
        destroyOnHidden
      >
        <Form layout="vertical" className="mt-4">
          <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
            <Form.Item
              label="Code"
              required
              extra={nameLocked ? "Used already, so the name can't change." : "3–20 letters, numbers or dashes"}
            >
              <Input
                value={draft.code}
                maxLength={20}
                placeholder="EID20"
                disabled={nameLocked}
                onChange={(e) => set({ code: e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, "") })}
              />
            </Form.Item>
            <Form.Item label="Description (optional, customers see it)">
              <Input value={draft.description} maxLength={120} placeholder="Eid offer" onChange={(e) => set({ description: e.target.value })} />
            </Form.Item>
            <Form.Item label="Discount" required>
              <Space.Compact className="w-full">
                <Segmented
                  value={draft.type}
                  onChange={(v) => set({ type: v as Draft["type"], value: null })}
                  options={[
                    { value: "percentage", label: "%" },
                    { value: "fixed", label: "PKR" },
                  ]}
                />
                <InputNumber
                  style={{ width: "100%" }}
                  min={1}
                  max={draft.type === "percentage" ? 100 : 1_000_000}
                  precision={0}
                  placeholder={draft.type === "percentage" ? "20" : "1000"}
                  value={draft.value}
                  onChange={(v) => set({ value: v })}
                  suffix={draft.type === "percentage" ? "% off" : "PKR off"}
                />
              </Space.Compact>
            </Form.Item>
            {draft.type === "percentage" ? (
              <Form.Item label="Most PKR off (optional)">
                <InputNumber style={{ width: "100%" }} min={1} precision={0} prefix="PKR" value={draft.maxDiscountPkr} onChange={(v) => set({ maxDiscountPkr: v })} />
              </Form.Item>
            ) : (
              <div />
            )}
            <Form.Item label="Valid from (optional)">
              <DatePicker className="w-full" value={draft.validFrom} onChange={(d) => set({ validFrom: d })} />
            </Form.Item>
            <Form.Item label="Valid until (optional)">
              <DatePicker className="w-full" value={draft.validUntil} onChange={(d) => set({ validUntil: d })} />
            </Form.Item>
            <Form.Item label="Total uses (optional)" extra="Empty = no limit">
              <InputNumber style={{ width: "100%" }} min={1} precision={0} value={draft.maxUses} onChange={(v) => set({ maxUses: v })} />
            </Form.Item>
            <Form.Item label="Uses per customer" extra="0 = no limit">
              <InputNumber style={{ width: "100%" }} min={0} precision={0} value={draft.maxUsesPerCustomer} onChange={(v) => set({ maxUsesPerCustomer: v })} />
            </Form.Item>
            <Form.Item label="Court fee at least (optional)">
              <InputNumber style={{ width: "100%" }} min={1} precision={0} prefix="PKR" value={draft.minFeePkr} onChange={(v) => set({ minFeePkr: v })} />
            </Form.Item>
          </div>
          <Form.Item label="Sports" extra="None ticked = every sport">
            <Checkbox.Group
              value={draft.sports}
              onChange={(v) => set({ sports: v as string[] })}
              options={sportList.map(({ sport, label }) => ({ value: sport, label }))}
            />
          </Form.Item>
          <Space size="large" wrap>
            <Checkbox checked={draft.newCustomersOnly} onChange={(e) => set({ newCustomersOnly: e.target.checked })}>
              First booking only
            </Checkbox>
            <Space>
              <Switch checked={draft.isActive} onChange={(v) => set({ isActive: v })} />
              <Text>Switched on</Text>
            </Space>
          </Space>
        </Form>
      </Modal>

      <Modal title={`Who used ${usesOf?.code ?? ""}`} open={!!usesOf} onCancel={() => setUsesOf(null)} footer={null} width={720}>
        <Table
          size="small"
          rowKey="id"
          loading={uses.isPending}
          dataSource={uses.data?.uses ?? []}
          pagination={{ pageSize: 10, hideOnSinglePage: true }}
          locale={{ emptyText: "Not used yet." }}
          columns={[
            { title: "When", dataIndex: "date", render: when },
            {
              title: "Customer",
              key: "customer",
              render: (_, u) => (u.userId ? <Link href={`/admin/customers/${u.userId}`}>{u.customer}</Link> : `${u.customer} (guest)`),
            },
            {
              title: "Booking",
              key: "booking",
              render: (_, u) => (u.bookingId ? <Link href={`/admin/bookings/${u.bookingId}/edit`}>{u.bookingRef ?? "Open"}</Link> : "Deleted"),
            },
            { title: "Off", dataIndex: "discountPkr", render: pkr },
            {
              title: "",
              dataIndex: "status",
              render: (s: string) => (s === "released" ? <Tag>Booking cancelled</Tag> : <Tag color="green">Used</Tag>),
            },
          ]}
        />
      </Modal>
    </AdminLayout>
  );
}
