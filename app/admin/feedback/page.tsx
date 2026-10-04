"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { App, Card, Input, Rate, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminTableSkeleton } from "@/components/admin/loaders";
import {
  useAllFeedback,
  getQueryLoadingState,
} from "@/lib/tanstack/hooks/queries";
import type { AdminFeedback } from "@/lib/tanstack/types/feedback.types";

const { Text } = Typography;

type FeedbackRecord = AdminFeedback;

function getBookingIdDisplay(bookingId: FeedbackRecord["bookingId"]): string {
  if (typeof bookingId === "object" && bookingId?._id) {
    return `#${bookingId._id.slice(-8)}`;
  }
  if (typeof bookingId === "string") {
    return `#${bookingId.slice(-8)}`;
  }
  return "N/A";
}

function getBookingIdFilterValue(
  bookingId: FeedbackRecord["bookingId"],
): string {
  if (typeof bookingId === "object" && bookingId?._id) {
    return bookingId._id;
  }
  if (typeof bookingId === "string") {
    return bookingId;
  }
  return "";
}

export default function FeedbackPage() {
  const { data: session } = useSession();
  const { message } = App.useApp();
  const [filter, setFilter] = useState("");

  const feedbackQuery = useAllFeedback({ enabled: !!session });
  const { isInitialLoading, isRefreshing } = getQueryLoadingState(feedbackQuery);
  const feedbacks = feedbackQuery.data ?? [];

  useEffect(() => {
    if (feedbackQuery.error) {
      message.error(
        feedbackQuery.error instanceof Error
          ? feedbackQuery.error.message
          : "Failed to load feedback",
      );
    }
  }, [feedbackQuery.error, message]);

  const filteredFeedbacks = useMemo(() => {
    const q = filter.toLowerCase();
    if (!q) return feedbacks;
    return feedbacks.filter(
      (f) =>
        f.userName.toLowerCase().includes(q) ||
        f.userEmail.toLowerCase().includes(q) ||
        getBookingIdFilterValue(f.bookingId).includes(filter) ||
        (f.comment || "").toLowerCase().includes(q),
    );
  }, [feedbacks, filter]);

  const columns: ColumnsType<FeedbackRecord> = useMemo(
    () => [
      {
        title: "User",
        key: "user",
        width: 180,
        sorter: (a, b) => (a.userName || "").localeCompare(b.userName || ""),
        render: (_, record) => (
          <div>
            <div className="font-medium text-[var(--ant-color-text)]">{record.userName}</div>
            <Text type="secondary" className="text-xs">
              {record.userEmail}
            </Text>
          </div>
        ),
      },
      {
        title: "Booking ID",
        key: "bookingId",
        width: 120,
        render: (_, record) => (
          <Text type="secondary" className="font-mono text-sm">
            {getBookingIdDisplay(record.bookingId)}
          </Text>
        ),
      },
      {
        title: "Rating",
        dataIndex: "rating",
        key: "rating",
        width: 180,
        sorter: (a, b) => (a.rating || 0) - (b.rating || 0),
        render: (rating: number) => (
          <div className="flex items-center gap-2">
            <Rate disabled allowHalf={false} value={rating} />
            <Text type="secondary" className="text-sm">
              ({rating}/5)
            </Text>
          </div>
        ),
      },
      {
        title: "Comment",
        key: "comment",
        width: 240,
        render: (_, record) => (
          <p className="m-0 line-clamp-2 text-sm text-[var(--ant-color-text-secondary)]">
            {record.comment || "No comment"}
          </p>
        ),
      },
      {
        title: "Court Type",
        dataIndex: "courtType",
        key: "courtType",
        width: 120,
        sorter: (a, b) =>
          (a.courtType || "N/A").localeCompare(b.courtType || "N/A"),
        render: (courtType: string | undefined) => (
          <Tag>{courtType || "N/A"}</Tag>
        ),
      },
      {
        title: "Date",
        dataIndex: "createdAt",
        key: "createdAt",
        width: 160,
        sorter: (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        render: (createdAt: string) => (
          <Text type="secondary" className="text-xs">
            {new Date(createdAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        ),
      },
    ],
    [],
  );

  return (
    <AdminLayout
      title="Feedback"
      description="View customer feedback"
      onRefresh={() => feedbackQuery.refetch()}
      isLoading={isRefreshing}
    >
      {isInitialLoading ? (
        <AdminTableSkeleton />
      ) : (
        <div className="space-y-4">
          <Input.Search
            placeholder="Search by name, email, booking ID or comment..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            allowClear
            className="w-full sm:max-w-xl"
          />

          <Card className="border-[var(--ant-color-border)]" styles={{ body: { padding: 0 } }}>
            <Table<FeedbackRecord>
              columns={columns}
              dataSource={filteredFeedbacks}
              rowKey="_id"
              pagination={{ pageSize: 20, showSizeChanger: true }}
              scroll={{ x: "max-content" }}
              locale={{
                emptyText: filter
                  ? "No feedback found matching your search."
                  : "No feedback submitted yet.",
              }}
            />
          </Card>
        </div>
      )}
    </AdminLayout>
  );
}
