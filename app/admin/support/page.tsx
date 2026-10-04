"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  App,
  Button,
  Card,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminTableSkeleton } from "@/components/admin/loaders";
import {
  fetchAdminSupportTickets,
  replyAdminSupportTicket,
} from "@/lib/tanstack/requests/admin-ops.requests";

const { Text } = Typography;
const { TextArea } = Input;

type TicketRow = {
  _id: string;
  topic: string;
  status: string;
  updatedAt: string;
  userId?: { name?: string; email?: string };
  messages?: Array<{ authorType: string; body: string; createdAt: string }>;
};

const supportKeys = {
  all: ["admin", "support"] as const,
};

export default function AdminSupportPage() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [active, setActive] = useState<TicketRow | null>(null);
  const [reply, setReply] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "closed">(
    "open",
  );
  const [search, setSearch] = useState("");

  const { data, isPending, isFetching, refetch } = useQuery({
    queryKey: supportKeys.all,
    queryFn: async () => {
      const result = await fetchAdminSupportTickets();
      return (result.tickets || []) as TicketRow[];
    },
  });

  const tickets = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data ?? []).filter((t) => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (!q) return true;
      const user = `${t.userId?.name || ""} ${t.userId?.email || ""}`.toLowerCase();
      return t.topic.toLowerCase().includes(q) || user.includes(q);
    });
  }, [data, search, statusFilter]);

  const columns: ColumnsType<TicketRow> = [
    { title: "Topic", dataIndex: "topic", key: "topic" },
    {
      title: "User",
      key: "user",
      render: (_, row) => row.userId?.name || row.userId?.email || "—",
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 110,
      render: (status: string) => (
        <Tag color={status === "open" ? "processing" : "default"}>
          {status}
        </Tag>
      ),
    },
    {
      title: "Updated",
      dataIndex: "updatedAt",
      key: "updatedAt",
      render: (v: string) => new Date(v).toLocaleString(),
    },
    {
      title: "Actions",
      key: "actions",
      width: 90,
      render: (_, row) => (
        <Button
          type="link"
          onClick={() => {
            setActive(row);
            setReply("");
          }}
        >
          Open
        </Button>
      ),
    },
  ];

  const sendReply = async (close?: boolean) => {
    if (!active) return;
    setSubmitting(true);
    try {
      await replyAdminSupportTicket({
        ticketId: active._id,
        message: reply,
        close,
      });
      message.success(close ? "Replied and closed" : "Reply sent");
      setReply("");
      await queryClient.invalidateQueries({ queryKey: supportKeys.all });
      if (close) {
        setActive(null);
      } else {
        const refreshed = await fetchAdminSupportTickets();
        const next = ((refreshed.tickets || []) as TicketRow[]).find(
          (t) => t._id === active._id,
        );
        if (next) setActive(next);
      }
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminLayout
      title="Support"
      description="Customer support inbox"
      onRefresh={() => void refetch()}
      isLoading={isFetching}
    >
      <Space wrap className="mb-4">
        <Input.Search
          allowClear
          placeholder="Search topic or user…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: 280 }}
        />
        <Select
          value={statusFilter}
          onChange={setStatusFilter}
          style={{ width: 160 }}
          options={[
            { value: "all", label: "All statuses" },
            { value: "open", label: "Open" },
            { value: "closed", label: "Closed" },
          ]}
        />
      </Space>

      {isPending ? (
        <AdminTableSkeleton />
      ) : (
        <Card styles={{ body: { padding: 0 } }}>
          <Table
            rowKey="_id"
            columns={columns}
            dataSource={tickets}
            pagination={{ pageSize: 20, showSizeChanger: true }}
          />
        </Card>
      )}

      <Modal
        open={!!active}
        title={active?.topic}
        onCancel={() => setActive(null)}
        footer={null}
        width={640}
      >
        {active && (
          <Space direction="vertical" className="w-full" size="middle">
            <Tag color={active.status === "open" ? "processing" : "default"}>
              {active.status}
            </Tag>
            <div className="max-h-64 space-y-2 overflow-y-auto">
              {(active.messages || []).map((m, i) => (
                <div
                  key={i}
                  className="rounded-lg bg-[var(--ant-color-bg-elevated)] p-3 text-sm"
                >
                  <Text type="secondary" className="text-xs">
                    {m.authorType} · {new Date(m.createdAt).toLocaleString()}
                  </Text>
                  <div>{m.body}</div>
                </div>
              ))}
            </div>
            <TextArea
              rows={3}
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Reply…"
            />
            <Space wrap>
              <Button
                type="primary"
                loading={submitting}
                disabled={!reply.trim()}
                onClick={() => void sendReply(false)}
              >
                Send reply
              </Button>
              <Button
                loading={submitting}
                disabled={!reply.trim()}
                onClick={() => void sendReply(true)}
              >
                Reply & close
              </Button>
            </Space>
          </Space>
        )}
      </Modal>
    </AdminLayout>
  );
}