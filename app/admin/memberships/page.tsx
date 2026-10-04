"use client";

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
  const [plans, setPlans] = useState<Array<{ _id: string; name: string }>>([]);
  const [planId, setPlanId] = useState<string>();
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
      setPlans(
        (planResult.plans || []) as Array<{ _id: string; name: string }>,
      );
      return {
        rows: (roster.rows || []) as MembershipRosterRow[],
        totalCount: roster.totalCount ?? roster.rows?.length ?? 0,
      };
    },
  });

  const columns: ColumnsType<MembershipRosterRow> = [
    { title: "Name", dataIndex: "name" },
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
      width: 110,
      render: (_, row) => row.membership?.hoursRemaining ?? "—",
    },
    {
      title: "Guest passes",
      key: "passes",
      width: 120,
      render: (_, row) => row.membership?.guestPassesRemaining ?? "—",
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
          <Button size="small" onClick={() => setLoyaltyUser(row)}>
            Adjust points
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
      });
      message.success("Membership activated");
      setActivateUser(null);
      setPlanId(undefined);
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
      >
        <Form layout="vertical" className="mt-4">
          <Form.Item label="Plan" required>
            <Select
              value={planId}
              onChange={setPlanId}
              options={plans.map((p) => ({ value: p._id, label: p.name }))}
              placeholder="Select plan"
            />
          </Form.Item>
          <Form.Item label="Carry forward unused hours">
            <Switch checked={carry} onChange={setCarry} />
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
    </AdminLayout>
  );
}
