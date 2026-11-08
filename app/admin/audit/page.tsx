"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useQueryClient } from "@tanstack/react-query";
import { Alert, Card, DatePicker, Input, Select, Space, Tag } from "antd";
import type { Dayjs } from "dayjs";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AuditTable } from "@/components/admin/AuditTable";
import { AREA_LABELS, AUDIT_AREAS } from "@/lib/audit-rules";

/** Admin → Audit log: who changed settings, prices, money and bookings, and when. */
export default function AuditPage() {
  const { data: session } = useSession();
  const isSuperAdmin = session?.user?.role === "super_admin";
  const queryClient = useQueryClient();
  const [area, setArea] = useState<string | undefined>();
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [dates, setDates] = useState<[Dayjs, Dayjs] | null>(null);
  const [staff, setStaff] = useState<{ id: string; name: string } | null>(null);

  if (session && !isSuperAdmin) {
    return (
      <AdminLayout title="Audit log" description="Who changed what">
        <Alert type="info" showIcon title="Only the super admin can see the audit log." />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title="Audit log"
      description="Every change staff made to settings, prices, discounts, codes, memberships, wallets, points and bookings. Click a row to see what changed."
      onRefresh={() => void queryClient.invalidateQueries({ queryKey: ["admin", "audit"] })}
    >
      <Card styles={{ body: { paddingTop: 12 } }}>
        <Space wrap className="mb-3">
          <Select
            allowClear
            placeholder="All areas"
            style={{ width: 210 }}
            value={area}
            onChange={setArea}
            options={AUDIT_AREAS.map((a) => ({ value: a, label: AREA_LABELS[a] }))}
          />
          <Input.Search
            allowClear
            placeholder="Search, e.g. IBX-2137 or Padel"
            style={{ width: 260 }}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              if (!e.target.value) setQ("");
            }}
            onSearch={setQ}
          />
          <DatePicker.RangePicker value={dates} onChange={(v) => setDates(v && v[0] && v[1] ? [v[0], v[1]] : null)} />
          {staff && (
            <Tag closable onClose={() => setStaff(null)} color="blue">
              By {staff.name}
            </Tag>
          )}
        </Space>
        <AuditTable
          filters={{
            area,
            q,
            actorId: staff?.id,
            from: dates?.[0].format("YYYY-MM-DD"),
            to: dates?.[1].format("YYYY-MM-DD"),
          }}
          onPickStaff={(id, name) => setStaff({ id, name })}
        />
      </Card>
    </AdminLayout>
  );
}
