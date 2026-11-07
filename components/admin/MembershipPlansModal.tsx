"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { App, Button, Checkbox, Input, InputNumber, Modal, Space, Table, Tag, Typography } from "antd";
import { bffFetch } from "@/lib/bff/client";

const { Text } = Typography;

export const SPORT_LABELS: Record<string, string> = {
  PADEL: "Padel",
  PICKLEBALL: "Pickleball",
  FUTSAL: "Futsal",
  CRICKET: "Cricket",
};

type AdminPlan = {
  _id: string;
  name: string;
  price: number;
  validityDays: number;
  weekdayOnly: boolean;
  hoursBySport: { sport: string; hours: number }[];
  oldPoolHours: number;
  badge: string | null;
  features: string[];
  isActive: boolean;
  sortOrder: number;
};

type Draft = {
  id: string | null;
  name: string;
  price: number | null;
  validityDays: number | null;
  weekdayOnly: boolean;
  hours: Record<string, number | null>;
  badge: string;
  features: string;
  isActive: boolean;
  sortOrder: number | null;
};

const emptyDraft = (): Draft => ({
  id: null,
  name: "",
  price: null,
  validityDays: 30,
  weekdayOnly: false,
  hours: {},
  badge: "",
  features: "",
  isActive: true,
  sortOrder: 0,
});

const pkr = (n: number) => `PKR ${Math.round(n).toLocaleString("en-PK")}`;
const hoursText = (rows: { sport: string; hours: number }[]) =>
  rows.length ? rows.map((h) => `${SPORT_LABELS[h.sport] ?? h.sport} ${h.hours}h`).join(" · ") : null;

/** Super admin: make and edit membership plans (hours per sport, price, days, weekdays only). */
export function MembershipPlansModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);

  const { data, isPending } = useQuery({
    queryKey: ["admin", "membership-plans"],
    enabled: open,
    queryFn: () => bffFetch<{ plans: AdminPlan[] }>("/api/v1/admin/membership-plans"),
  });

  const edit = (p: AdminPlan) =>
    setDraft({
      id: p._id,
      name: p.name,
      price: p.price,
      validityDays: p.validityDays,
      weekdayOnly: p.weekdayOnly,
      hours: Object.fromEntries(p.hoursBySport.map((h) => [h.sport, h.hours])),
      badge: p.badge ?? "",
      features: p.features.join("\n"),
      isActive: p.isActive,
      sortOrder: p.sortOrder,
    });

  const save = async () => {
    if (!draft) return;
    setBusy(true);
    try {
      const body = {
        name: draft.name,
        price: draft.price,
        validityDays: draft.validityDays,
        weekdayOnly: draft.weekdayOnly,
        hoursBySport: Object.entries(draft.hours)
          .filter(([, h]) => (h ?? 0) > 0)
          .map(([sport, hours]) => ({ sport, hours })),
        badge: draft.badge,
        features: draft.features.split("\n"),
        isActive: draft.isActive,
        sortOrder: draft.sortOrder ?? 0,
      };
      await bffFetch(draft.id ? `/api/v1/admin/membership-plans/${draft.id}` : "/api/v1/admin/membership-plans", {
        method: draft.id ? "PATCH" : "POST",
        body: JSON.stringify(body),
      });
      message.success("Plan saved");
      setDraft(null);
      await queryClient.invalidateQueries({ queryKey: ["admin", "membership-plans"] });
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Modal title="Membership plans" open={open} onCancel={onClose} footer={null} width={760}>
        <Space orientation="vertical" style={{ width: "100%" }}>
          <Text type="secondary">
            Customers buy plans on WhatsApp; staff then press Activate. Changing a plan only affects new activations.
          </Text>
          <Button type="primary" onClick={() => setDraft(emptyDraft())}>
            New plan
          </Button>
          <Table
            size="small"
            rowKey="_id"
            loading={isPending}
            pagination={false}
            dataSource={data?.plans ?? []}
            columns={[
              {
                title: "Plan",
                render: (_, p: AdminPlan) => (
                  <Space size={4} wrap>
                    <Text strong>{p.name}</Text>
                    {p.badge && <Tag color="gold">{p.badge}</Tag>}
                    {!p.isActive && <Tag>Not on sale</Tag>}
                  </Space>
                ),
              },
              { title: "Price", render: (_, p: AdminPlan) => pkr(p.price) },
              {
                title: "Hours",
                render: (_, p: AdminPlan) =>
                  hoursText(p.hoursBySport) ?? (
                    <Text type="warning">Not set (old plan: {p.oldPoolHours}h shared)</Text>
                  ),
              },
              {
                title: "Days",
                render: (_, p: AdminPlan) => `${p.validityDays}${p.weekdayOnly ? " · weekdays" : ""}`,
              },
              { title: "", render: (_, p: AdminPlan) => <Button size="small" onClick={() => edit(p)}>Edit</Button> },
            ]}
          />
        </Space>
      </Modal>

      <Modal
        title={draft?.id ? `Edit ${draft.name}` : "New plan"}
        open={!!draft}
        onCancel={() => setDraft(null)}
        onOk={save}
        okText="Save plan"
        confirmLoading={busy}
        okButtonProps={{
          disabled:
            !draft ||
            draft.name.trim().length < 2 ||
            draft.price === null ||
            !Object.values(draft.hours).some((h) => (h ?? 0) > 0),
        }}
      >
        {draft && (
          <Space orientation="vertical" style={{ width: "100%" }}>
            <Input placeholder="Name, e.g. Gold" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            <Space wrap>
              <InputNumber min={0} prefix="PKR" placeholder="Price" value={draft.price} onChange={(v) => setDraft({ ...draft, price: v })} style={{ width: 180 }} />
              <InputNumber min={1} max={366} suffix="days" value={draft.validityDays} onChange={(v) => setDraft({ ...draft, validityDays: v })} style={{ width: 150 }} />
            </Space>
            <Text>Hours per sport</Text>
            <Space wrap>
              {Object.keys(SPORT_LABELS).map((sport) => (
                <InputNumber
                  key={sport}
                  min={0}
                  step={0.5}
                  prefix={SPORT_LABELS[sport]}
                  value={draft.hours[sport] ?? null}
                  onChange={(v) => setDraft({ ...draft, hours: { ...draft.hours, [sport]: v } })}
                  style={{ width: 170 }}
                />
              ))}
            </Space>
            <Checkbox checked={draft.weekdayOnly} onChange={(e) => setDraft({ ...draft, weekdayOnly: e.target.checked })}>
              Weekdays only (Mon–Fri)
            </Checkbox>
            <Input placeholder="Badge (optional), e.g. Best value" maxLength={30} value={draft.badge} onChange={(e) => setDraft({ ...draft, badge: e.target.value })} />
            <Input.TextArea rows={3} placeholder="Features, one per line (optional)" value={draft.features} onChange={(e) => setDraft({ ...draft, features: e.target.value })} />
            <Space wrap>
              <InputNumber prefix="Order" value={draft.sortOrder} onChange={(v) => setDraft({ ...draft, sortOrder: v })} style={{ width: 140 }} />
              <Checkbox checked={draft.isActive} onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })}>
                On sale
              </Checkbox>
            </Space>
          </Space>
        )}
      </Modal>
    </>
  );
}
