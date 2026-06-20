"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { App, Card, Input, Rate, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { getAllFeedback } from "../../actions/feedback";

const { Text } = Typography;

type FeedbackRecord = {
  _id: string;
  bookingId: string | { _id: string };
  userName: string;
  userEmail: string;
  rating: number;
  comment?: string;
  courtType?: string;
  createdAt: string;
};

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
  const [feedbacks, setFeedbacks] = useState<FeedbackRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    if (session) {
      loadData();
    }
  }, [session]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const result = await getAllFeedback();
      if (result.success) {
        setFeedbacks(result.feedbacks);
      } else {
        message.error(result.error || "Failed to load feedback");
      }
    } catch (error) {
      console.error(error);
      message.error("Failed to load feedback");
    } finally {
      setIsLoading(false);
    }
  };

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
            <div className="font-medium text-white">{record.userName}</div>
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
          <p className="m-0 line-clamp-2 text-sm text-zinc-300">
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
      onRefresh={loadData}
      isLoading={isLoading}
    >
      <div className="space-y-4">
        <Input.Search
          placeholder="Search by name, email, booking ID or comment..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          allowClear
          className="w-full sm:max-w-xl"
        />

        <Card className="border-zinc-800" styles={{ body: { padding: 0 } }}>
          <Table<FeedbackRecord>
            columns={columns}
            dataSource={filteredFeedbacks}
            rowKey="_id"
            loading={isLoading}
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
    </AdminLayout>
  );
}
