"use client";

import Link from "next/link";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  App,
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Switch,
  Table,
  Tag,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminTableSkeleton } from "@/components/admin/loaders";
import { WalletModal } from "@/components/admin/WalletModal";
import { HoursBankModal } from "@/components/admin/HoursBankModal";
import { MEMBERSHIP_PAYMENT_METHODS, PAYMENT_METHOD_LABELS, type MembershipPaymentMethod } from "@/lib/membership-payment";
import { MembershipPlansModal, SPORT_LABELS } from "@/components/admin/MembershipPlansModal";
import { useSession } from "next-auth/react";
import {
  activateAdminMembership,
  adjustAdminLoyalty,
  fetchAdminMembershipPlans,
  fetchAdminMembershipRoster,
  type MembershipRosterRow,
} from "@/lib/tanstack/requests/admin-ops.requests";

const rosterKeys = {
  all: ["admin", "membership-roster"] as const,
  list: (input: {
    search: string;
    membershipFilter: "all" | "active" | "none";
    page: number;
    limit: number;
  }) => [...rosterKeys.all, input] as const,
};

export default function AdminMembershipsPage() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [membershipFilter, setMembershipFilter] = useState<
    "all" | "active" | "none"
  >("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [activateUser, setActivateUser] = useState<MembershipRosterRow | null>(
    null,
  );
  const [loyaltyUser, setLoyaltyUser] = useState<MembershipRosterRow | null>(
    null,
  );
  const [walletUser, setWalletUser] = useState<MembershipRosterRow | null>(
    null,
  );
  type PlanOption = { _id: string; name: string; hoursBySport?: { sport: string; hours: number }[] };
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [planId, setPlanId] = useState<string>();
  const [hoursBySport, setHoursBySport] = useState<Record<string, number | null>>({});
  const [plansOpen, setPlansOpen] = useState(false);
  const [hoursUser, setHoursUser] = useState<MembershipRosterRow | null>(null);
  const [payMethod, setPayMethod] = useState<MembershipPaymentMethod>();
  const [payAmount, setPayAmount] = useState<number | null>(null);
  const [payNote, setPayNote] = useState("");
  const { data: session } = useSession();
  const isSuperAdmin = session?.user?.role === "super_admin";
  const [carry, setCarry] = useState(true);
  const [delta, setDelta] = useState(0);
  const [busy, setBusy] = useState(false);

  const rosterInput = useMemo(
    () => ({
      search: debouncedSearch,
      membershipFilter,
      page,
      limit: pageSize,
    }),
    [debouncedSearch, membershipFilter, page, pageSize],
  );

  const rosterQuery = useQuery({
    queryKey: rosterKeys.list(rosterInput),
    queryFn: async () => {
      const [roster, planResult] = await Promise.all([
        fetchAdminMembershipRoster(rosterInput),
        fetchAdminMembershipPlans(),
      ]);
      setPlans((planResult.plans || []) as PlanOption[]);
      return {
        rows: (roster.rows || []) as MembershipRosterRow[],
        totalCount: roster.totalCount ?? roster.rows?.length ?? 0,
      };
    },
  });

  const columns: ColumnsType<MembershipRosterRow> = [
    {
      title: "Name",
      dataIndex: "name",
      render: (name: string, row) => <Link href={`/admin/customers/${row._id}`}>{name}</Link>,
    },
    { title: "Email", dataIndex: "email" },
    {
      title: "Plan",
      key: "plan",
      render: (_, row) =>
        row.membership ? (
          <Tag color="processing">{row.membership.planName}</Tag>
        ) : (
          <Tag>None</Tag>
        ),
    },
    {
      title: "Hours left",
      key: "hours",
      render: (_, row) => {
        const rows = row.membership?.hoursBySport ?? [];
        if (!row.membership) return "—";
        if (rows.length === 0) return `${row.membership.hoursRemaining} (old plan)`;
        return rows.map((h) => `${SPORT_LABELS[h.sport] ?? h.sport} ${h.remaining}h`).join(" · ");
      },
    },
    {
      title: "Valid until",
      key: "valid",
      render: (_, row) =>
        row.membership
          ? new Date(row.membership.validUntil).toLocaleDateString()
          : "—",
    },
    {
      title: "Loyalty",
      dataIndex: "loyaltyBalance",
      width: 100,
      render: (v: number) => v.toLocaleString(),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, row) => (
        <Space wrap>
          <Button size="small" onClick={() => setActivateUser(row)}>
            Activate
          </Button>
          <Button size="small" onClick={() => setHoursUser(row)}>
            Hours
          </Button>
          <Button size="small" onClick={() => setLoyaltyUser(row)}>
            Adjust points
          </Button>
          <Button size="small" onClick={() => setWalletUser(row)}>
            Wallet
          </Button>
        </Space>
      ),
    },
  ];

  const onActivate = async () => {
    if (!activateUser || !planId) return;
    setBusy(true);
    try {
      await activateAdminMembership({
        userId: activateUser._id,
        planId,
        carryForwardHours: carry,
        hoursBySport: Object.entries(hoursBySport)
          .filter(([, h]) => (h ?? 0) > 0)
          .map(([sport, h]) => ({ sport, hours: h as number })),
        payment: payMethod
          ? { method: payMethod, pricePaid: payMethod === "free" ? 0 : (payAmount ?? 0), note: payNote.trim() || undefined }
          : null,
      });
      message.success("Membership activated");
      setActivateUser(null);
      setPlanId(undefined);
      setPayMethod(undefined);
      setPayAmount(null);
      setPayNote("");
      await queryClient.invalidateQueries({ queryKey: rosterKeys.all });
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const onAdjust = async () => {
    if (!loyaltyUser || !delta) return;
    setBusy(true);
    try {
      const result = await adjustAdminLoyalty({
        userId: loyaltyUser._id,
        delta,
        note: "Admin adjustment",
      });
      message.success(`Balance is now ${result.balance}`);
      setLoyaltyUser(null);
      setDelta(0);
      await queryClient.invalidateQueries({ queryKey: rosterKeys.all });
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminLayout
      title="Memberships & Loyalty"
      description="Customer roster with active plans, hours, and reward points"
      onRefresh={() => void rosterQuery.refetch()}
      isLoading={rosterQuery.isFetching}
    >
      <Space wrap className="mb-4">
        <Input.Search
          allowClear
          placeholder="Search name, email, phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onSearch={(value) => {
            setDebouncedSearch(value.trim());
            setPage(1);
          }}
          style={{ width: 280 }}
        />
        <Select
          value={membershipFilter}
          onChange={(v) => {
            setMembershipFilter(v);
            setPage(1);
          }}
          style={{ width: 180 }}
          options={[
            { value: "all", label: "All customers" },
            { value: "active", label: "Active membership" },
            { value: "none", label: "No membership" },
          ]}
        />
        {isSuperAdmin && <Button onClick={() => setPlansOpen(true)}>Plans</Button>}
      </Space>

      {rosterQuery.isLoading ? (
        <AdminTableSkeleton />
      ) : (
        <Card styles={{ body: { padding: 0 } }}>
          <Table
            rowKey="_id"
            columns={columns}
            dataSource={rosterQuery.data?.rows || []}
            pagination={{
              current: page,
              pageSize,
              total: rosterQuery.data?.totalCount || 0,
              showSizeChanger: true,
              onChange: (nextPage, nextSize) => {
                setPage(nextPage);
                setPageSize(nextSize);
              },
            }}
          />
        </Card>
      )}

      <Modal
        title={`Activate membership — ${activateUser?.name || ""}`}
        open={!!activateUser}
        onCancel={() => setActivateUser(null)}
        onOk={onActivate}
        confirmLoading={busy}
        okText="Activate"
        okButtonProps={{ disabled: !planId || (!!payMethod && payMethod !== "free" && !payAmount) }}
      >
        <Form layout="vertical" className="mt-4">
          <Form.Item label="Plan" required>
            <Select
              value={planId}
              onChange={(id) => {
                setPlanId(id);
                const plan = plans.find((p) => p._id === id);
                setHoursBySport(
                  Object.fromEntries((plan?.hoursBySport ?? []).map((h) => [h.sport, h.hours])),
                );
              }}
              options={plans.map((p) => ({ value: p._id, label: p.name }))}
              placeholder={plans.length ? "Select plan" : "No plans with hours per sport yet"}
            />
          </Form.Item>
          {planId && (
            <Form.Item label="Hours per sport (change for this customer if needed)">
              <Space wrap>
                {Object.keys(SPORT_LABELS).map((sport) => (
                  <InputNumber
                    key={sport}
                    min={0}
                    step={0.5}
                    prefix={SPORT_LABELS[sport]}
                    value={hoursBySport[sport] ?? null}
                    onChange={(v) => setHoursBySport((prev) => ({ ...prev, [sport]: v }))}
                    style={{ width: 170 }}
                  />
                ))}
              </Space>
            </Form.Item>
          )}
          <Form.Item label="Carry forward unused hours">
            <Switch checked={carry} onChange={setCarry} />
          </Form.Item>
          <Form.Item label="Payment received (optional, for reports)">
            <Space wrap>
              <Select
                allowClear
                placeholder="How they paid"
                value={payMethod}
                onChange={(v) => setPayMethod(v)}
                style={{ width: 180 }}
                options={MEMBERSHIP_PAYMENT_METHODS.map((m) => ({ value: m, label: PAYMENT_METHOD_LABELS[m] }))}
              />
              {payMethod && payMethod !== "free" && (
                <InputNumber
                  min={1}
                  precision={0}
                  prefix="PKR"
                  placeholder="Amount"
                  value={payAmount}
                  onChange={(v) => setPayAmount(v)}
                  style={{ width: 160 }}
                />
              )}
            </Space>
            {payMethod && (
              <Input
                className="mt-2"
                maxLength={300}
                placeholder="Note (optional), e.g. receipt number"
                value={payNote}
                onChange={(e) => setPayNote(e.target.value)}
              />
            )}
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`Adjust loyalty — ${loyaltyUser?.name || ""}`}
        open={!!loyaltyUser}
        onCancel={() => setLoyaltyUser(null)}
        onOk={onAdjust}
        confirmLoading={busy}
        okText="Apply"
      >
        <Form layout="vertical" className="mt-4">
          <Form.Item label="Current balance">
            <Input
              disabled
              value={(loyaltyUser?.loyaltyBalance ?? 0).toLocaleString()}
            />
          </Form.Item>
          <Form.Item label="Points delta (+earn / −debit)" required>
            <InputNumber
              className="w-full"
              value={delta}
              onChange={(v) => setDelta(Number(v) || 0)}
            />
          </Form.Item>
        </Form>
      </Modal>

      <WalletModal user={walletUser} onClose={() => setWalletUser(null)} />
      <HoursBankModal
        user={hoursUser}
        canEdit={isSuperAdmin}
        onClose={() => setHoursUser(null)}
        onChanged={() => void queryClient.invalidateQueries({ queryKey: rosterKeys.all })}
      />
      <MembershipPlansModal
        open={plansOpen}
        onClose={() => {
          setPlansOpen(false);
          void queryClient.invalidateQueries({ queryKey: rosterKeys.all });
        }}
      />
    </AdminLayout>
  );
}
