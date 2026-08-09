"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  App,
  Button,
  Card,
  DatePicker,
  Input,
  Modal,
  Pagination,
  Segmented,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import type { ColumnsType, TableProps } from "antd/es/table";
import type { Dayjs } from "dayjs";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  CloseOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminTableSkeleton } from "@/components/admin/loaders";
import { QRCode } from "@/components/ui/qr-code";
import {
  getQueryLoadingState,
  useBookingsPaginated,
  useBookingExtensionAvailability,
} from "@/lib/tanstack/hooks/queries";
import {
  useDeleteBookingMutation,
  useExtendBookingMutation,
  useUpdateBookingMutation,
} from "@/lib/tanstack/hooks/mutations";
import type { Booking, Court } from "@/types";
import { formatDisplayDate, formatTime12 } from "@/lib/utils";
import {
  getTodayRange,
  getCurrentWeekRange,
  getCurrentMonthRange,
  getRangeFromDates,
} from "@/lib/date-range-utils";

const { Text } = Typography;

type DateFilter = "all" | "today" | "week" | "month" | "range";
type SortColumn = keyof Booking | "courtName";

const DATE_FILTER_OPTIONS: { label: string; value: DateFilter }[] = [
  { label: "All", value: "all" },
  { label: "Today", value: "today" },
  { label: "This Week", value: "week" },
  { label: "This Month", value: "month" },
  { label: "Custom Range", value: "range" },
];

const STATUS_OPTIONS: { value: Booking["status"]; label: string }[] = [
  { value: "pending_payment", label: "Pending Payment" },
  { value: "confirmed", label: "Confirmed" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

function getCourtName(booking: Booking): string {
  return typeof booking.courtId === "object" &&
    booking.courtId &&
    "name" in booking.courtId
    ? (booking.courtId as Court).name || "Unknown Court"
    : "Unknown Court";
}

function formatStatusLabel(status: Booking["status"]): string {
  if (status === "pending_payment") return "Pending Payment";
  return (
    status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " ")
  );
}

function getStatusTagColor(status: Booking["status"]): string {
  switch (status) {
    case "confirmed":
      return "cyan";
    case "pending_payment":
      return "gold";
    case "cancelled":
      return "red";
    case "completed":
      return "green";
    default:
      return "default";
  }
}

function getEndTimeLabel(booking: Booking): string {
  const endTime =
    (((booking.startTime + booking.duration) % 24) + 24) % 24;
  const suffix =
    booking.startTime + booking.duration > 24 ? " (+1 day)" : "";
  return `${formatTime12(booking.startTime)} – ${formatTime12(endTime)}${suffix}`;
}

function sortBookings(
  bookings: Booking[],
  sortColumn: SortColumn | null,
  sortDirection: "asc" | "desc",
): Booking[] {
  if (!sortColumn) return bookings;

  return [...bookings].sort((a, b) => {
    let aValue: unknown;
    let bValue: unknown;

    if (sortColumn === "courtName") {
      aValue = getCourtName(a);
      bValue = getCourtName(b);
    } else if (sortColumn === "createdAt" || sortColumn === "updatedAt") {
      const aDate = new Date(a[sortColumn]);
      const bDate = new Date(b[sortColumn]);
      const diff = aDate.getTime() - bDate.getTime();
      return sortDirection === "asc" ? diff : -diff;
    } else if (sortColumn === "date") {
      const aDateStr = a.date;
      const bDateStr = b.date;

      if (aDateStr === bDateStr) {
        const timeDiff = a.startTime - b.startTime;
        return sortDirection === "asc" ? timeDiff : -timeDiff;
      }

      if (aDateStr < bDateStr) return sortDirection === "asc" ? -1 : 1;
      if (aDateStr > bDateStr) return sortDirection === "asc" ? 1 : -1;
      return 0;
    } else {
      const key = sortColumn as keyof Booking;
      aValue = a[key];
      bValue = b[key];
    }

    if (typeof aValue === "string" && typeof bValue === "string") {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    if (typeof aValue === "number" && typeof bValue === "number") {
      return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
    }

    return 0;
  });
}

export default function BookingsPage() {
  const { message } = App.useApp();
  const { data: session } = useSession();
  const router = useRouter();
  const [filter, setFilter] = useState("");
  const [debouncedFilter, setDebouncedFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [showBookingDetailsModal, setShowBookingDetailsModal] = useState(false);
  const [viewingBooking, setViewingBooking] = useState<Booking | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancellingBooking, setCancellingBooking] = useState<Booking | null>(
    null,
  );
  const [isCancelling, setIsCancelling] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingBooking, setDeletingBooking] = useState<Booking | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [updatingStatusBookingId, setUpdatingStatusBookingId] = useState<
    string | null
  >(null);
  const [extendingBookingId, setExtendingBookingId] = useState<string | null>(
    null,
  );
  const [extendingOption, setExtendingOption] = useState<0.5 | 1 | null>(null);
  const [extensionCheckBookingId, setExtensionCheckBookingId] = useState<
    string | null
  >(null);
  const [sortColumn, setSortColumn] = useState<SortColumn | null>("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [dateFilter, setDateFilter] = useState<DateFilter>("today");
  const [customRange, setCustomRange] = useState<
    [Dayjs | null, Dayjs | null] | null
  >(null);
  const [showRangeModal, setShowRangeModal] = useState(false);

  const userRole = session?.user.role;
  const isSuperAdmin = userRole === "super_admin";
  const isAdmin = userRole === "admin" || isSuperAdmin;

  const activeRange = useMemo(() => {
    const now = new Date();
    if (dateFilter === "today") return getTodayRange(now);
    if (dateFilter === "week") return getCurrentWeekRange(now);
    if (dateFilter === "month") return getCurrentMonthRange(now);
    if (dateFilter === "range") {
      return getRangeFromDates(
        customRange?.[0]?.toDate() ?? null,
        customRange?.[1]?.toDate() ?? null,
      );
    }
    return null;
  }, [dateFilter, customRange]);

  const bookingsInput = useMemo(
    () => ({
      page,
      limit: pageSize,
      dateRange: dateFilter === "all" ? null : activeRange,
      search: debouncedFilter,
    }),
    [page, pageSize, dateFilter, activeRange, debouncedFilter],
  );

  const bookingsQuery = useBookingsPaginated(bookingsInput, {
    enabled: !!session,
  });
  const { isInitialLoading, isRefreshing } = getQueryLoadingState(bookingsQuery);
  const bookings = bookingsQuery.data?.bookings ?? [];
  const totalCount = bookingsQuery.data?.totalCount ?? 0;

  const updateBookingMutation = useUpdateBookingMutation();
  const deleteBookingMutation = useDeleteBookingMutation();
  const extendBookingMutation = useExtendBookingMutation();

  const extensionQuery = useBookingExtensionAvailability(
    extensionCheckBookingId,
    { enabled: !!extensionCheckBookingId },
  );
  const extensionLoading = getQueryLoadingState(extensionQuery);

  const extensionAvailability = useMemo(() => {
    const result = extensionQuery.data;
    if (
      !extensionCheckBookingId ||
      !result ||
      !result.success ||
      extensionLoading.isLoading
    ) {
      return null;
    }
    return {
      bookingId: extensionCheckBookingId,
      checked: true,
      canExtend30: result.canExtend30 ?? false,
      canExtend60: result.canExtend60 ?? false,
    };
  }, [
    extensionCheckBookingId,
    extensionQuery.data,
    extensionLoading.isLoading,
  ]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedFilter(filter), 400);
    return () => clearTimeout(t);
  }, [filter]);

  useEffect(() => {
    setPage(1);
  }, [dateFilter, customRange, debouncedFilter]);

  useEffect(() => {
    setPage(1);
  }, [pageSize]);

  useEffect(() => {
    if (bookingsQuery.error) {
      message.error(
        bookingsQuery.error instanceof Error
          ? bookingsQuery.error.message
          : "Failed to load bookings",
      );
    }
  }, [bookingsQuery.error, message]);

  useEffect(() => {
    if (
      !extensionCheckBookingId ||
      !extensionQuery.isFetched ||
      extensionQuery.isFetching
    ) {
      return;
    }
    const result = extensionQuery.data;
    if (!result) return;
    if (!result.success) {
      message.error(result.error || "Failed to check extension availability");
      return;
    }
    if (!result.hasAnyOption) {
      message.warning("This booking cannot be extended right now.");
    }
  }, [
    extensionCheckBookingId,
    extensionQuery.data,
    extensionQuery.dataUpdatedAt,
    extensionQuery.isFetched,
    extensionQuery.isFetching,
    message,
  ]);

  const handleCancelBooking = (booking: Booking) => {
    if (booking.status === "completed") {
      message.warning("Completed bookings cannot be cancelled.");
      return;
    }
    setCancellingBooking(booking);
    setShowCancelModal(true);
  };

  const confirmCancelBooking = async () => {
    if (!cancellingBooking) return;

    setIsCancelling(true);
    try {
      const result = await updateBookingMutation.mutateAsync({
        bookingId: cancellingBooking._id,
        status: "cancelled",
      });

      if (result.success) {
        setShowCancelModal(false);
        setCancellingBooking(null);
      } else {
        message.error(result.error || "Failed to cancel booking");
      }
    } catch (error: unknown) {
      message.error(
        error instanceof Error ? error.message : "An error occurred",
      );
    } finally {
      setIsCancelling(false);
    }
  };

  const handleDeleteBooking = (booking: Booking) => {
    setDeletingBooking(booking);
    setShowDeleteModal(true);
  };

  const confirmDeleteBooking = async () => {
    if (!deletingBooking) return;

    setIsDeleting(true);
    try {
      const result = await deleteBookingMutation.mutateAsync(
        deletingBooking._id,
      );
      if (result.success) {
        setShowDeleteModal(false);
        setDeletingBooking(null);
      } else {
        message.error(result.error || "Failed to delete booking");
      }
    } catch (error: unknown) {
      message.error(
        error instanceof Error ? error.message : "An error occurred",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleStatusChange = async (
    bookingId: string,
    newStatus: Booking["status"],
  ) => {
    setUpdatingStatusBookingId(bookingId);
    try {
      const result = await updateBookingMutation.mutateAsync({
        bookingId,
        status: newStatus,
      });
      if (result.success) {
        if (viewingBooking?._id === bookingId) {
          setViewingBooking((prev) =>
            prev ? { ...prev, status: newStatus } : null,
          );
        }
      } else {
        message.error(result.error || "Failed to update status");
      }
    } catch (err: unknown) {
      message.error(
        err instanceof Error ? err.message : "Failed to update status",
      );
    } finally {
      setUpdatingStatusBookingId(null);
    }
  };

  const handleViewBooking = (booking: Booking) => {
    setViewingBooking(booking);
    setExtensionCheckBookingId(null);
    setShowBookingDetailsModal(true);
  };

  const handleEditBooking = (booking: Booking) => {
    router.push(`/admin/bookings/${booking._id}/edit`);
  };

  const handleExtendBooking = async (
    bookingId: string,
    extraDuration: 0.5 | 1,
  ) => {
    setExtendingBookingId(bookingId);
    setExtendingOption(extraDuration);
    try {
      const result = await extendBookingMutation.mutateAsync({
        bookingId,
        extraDuration,
      });
      if (result.success) {
        setViewingBooking(result.booking as Booking);
        setExtensionCheckBookingId(null);
      } else {
        message.error(result.error || "Failed to extend booking");
      }
    } catch (error: unknown) {
      message.error(
        error instanceof Error ? error.message : "Failed to extend booking",
      );
    } finally {
      setExtendingBookingId(null);
      setExtendingOption(null);
    }
  };

  const handleCheckExtensionAvailability = (bookingId: string) => {
    if (extensionCheckBookingId === bookingId) {
      void extensionQuery.refetch();
      return;
    }
    setExtensionCheckBookingId(bookingId);
  };

  const handleCreateBooking = () => {
    router.push("/admin/bookings/new");
  };

  const handleDateFilterChange = (value: DateFilter) => {
    if (value === "range") {
      setCustomRange(null);
      setDateFilter("range");
      setShowRangeModal(true);
    } else {
      setShowRangeModal(false);
      setDateFilter(value);
    }
  };

  const handleTableChange: TableProps<Booking>["onChange"] = (
    _pagination,
    _filters,
    sorter,
  ) => {
    const s = Array.isArray(sorter) ? sorter[0] : sorter;
    if (s?.columnKey && s.order) {
      setSortColumn(s.columnKey as SortColumn);
      setSortDirection(s.order === "ascend" ? "asc" : "desc");
    } else {
      setSortColumn("date");
      setSortDirection("desc");
    }
  };

  const sortedBookings = useMemo(
    () => sortBookings(bookings, sortColumn, sortDirection),
    [bookings, sortColumn, sortDirection],
  );
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const getSortOrder = (column: SortColumn) => {
    if (sortColumn !== column) return null;
    return sortDirection === "asc" ? ("ascend" as const) : ("descend" as const);
  };

  const columns: ColumnsType<Booking> = useMemo(
    () => [
      {
        title: "No.",
        key: "serialNumber",
        width: 70,
        render: (_, booking) => (
          <Text type="secondary" className="font-mono text-xs">
            {typeof booking.serialNumber === "number"
              ? booking.serialNumber.toString().padStart(3, "0")
              : "—"}
          </Text>
        ),
      },
      {
        title: "User",
        key: "userName",
        minWidth: 160,
        sorter: true,
        sortOrder: getSortOrder("userName"),
        render: (_, booking) => (
          <div>
            <div className="font-medium text-white">{booking.userName}</div>
            <Text
              type="secondary"
              className="block max-w-[180px] truncate text-xs"
              title={booking.userEmail}
            >
              {booking.userEmail}
            </Text>
            <Text type="secondary" className="text-xs">
              {booking.userPhone || "—"}
            </Text>
          </div>
        ),
      },
      {
        title: "Court",
        key: "courtName",
        minWidth: 100,
        sorter: true,
        sortOrder: getSortOrder("courtName"),
        render: (_, booking) => <Tag>{getCourtName(booking)}</Tag>,
      },
      {
        title: "Date & Time",
        key: "date",
        minWidth: 140,
        sorter: true,
        sortOrder: getSortOrder("date"),
        defaultSortOrder: "descend",
        render: (_, booking) => (
          <div>
            <div>{formatDisplayDate(booking.date)}</div>
            <Text type="secondary" className="text-xs">
              {getEndTimeLabel(booking)}
            </Text>
          </div>
        ),
      },
      {
        title: "Booking total",
        key: "totalPrice",
        minWidth: 100,
        sorter: true,
        sortOrder: getSortOrder("totalPrice"),
        render: (_, booking) => (
          <span className="font-semibold text-[#2DD4BF]">
            PKR {booking.totalPrice.toLocaleString()}
          </span>
        ),
      },
      {
        title: "Received & discount",
        key: "received",
        minWidth: 160,
        render: (_, booking) => {
          const online = booking.amountReceivedOnline ?? 0;
          const cash = booking.amountReceivedCash ?? 0;
          const received =
            online + cash > 0 ? online + cash : (booking.amountPaid ?? 0);
          const discount =
            booking.status === "completed" && booking.totalPrice - received > 0
              ? booking.totalPrice - received
              : 0;
          const hasBreakdown = online > 0 || cash > 0;

          return (
            <div className="space-y-1 text-xs">
              {hasBreakdown ? (
                <Text type="secondary">
                  Online {online.toLocaleString()} + Cash{" "}
                  {cash.toLocaleString()}
                </Text>
              ) : null}
              <div className="font-medium text-white">
                Total {received.toLocaleString()}
              </div>
              {discount > 0 && (
                <div className="text-amber-400">
                  Discount {discount.toLocaleString()}
                </div>
              )}
            </div>
          );
        },
      },
      {
        title: "Status",
        key: "status",
        minWidth: 180,
        sorter: true,
        sortOrder: getSortOrder("status"),
        render: (_, booking) => (
          <Select
            value={booking.status}
            onChange={(value) =>
              handleStatusChange(booking._id, value as Booking["status"])
            }
            disabled={updatingStatusBookingId === booking._id}
            loading={updatingStatusBookingId === booking._id}
            options={STATUS_OPTIONS}
            style={{ width: 165 }}
            popupMatchSelectWidth={false}
          />
        ),
      },
      {
        title: "Actions",
        key: "actions",
        align: "right",
        minWidth: 140,
        fixed: "right",
        render: (_, booking) => (
          <Space size="small">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => handleViewBooking(booking)}
              title="View Details"
            />
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEditBooking(booking)}
              title="Edit"
            />
            {(booking.status === "confirmed" ||
              booking.status === "pending_payment") && (
              <Button
                type="text"
                danger
                icon={<CloseOutlined />}
                onClick={() => handleCancelBooking(booking)}
                title="Cancel Booking"
              />
            )}
            {isSuperAdmin && (
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                onClick={() => handleDeleteBooking(booking)}
                title="Delete"
              />
            )}
          </Space>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sortColumn, sortDirection, updatingStatusBookingId, isSuperAdmin],
  );

  if (!isAdmin) {
    router.push("/admin");
    return null;
  }

  const closeBookingDetailsModal = () => {
    setShowBookingDetailsModal(false);
    setViewingBooking(null);
    setExtensionCheckBookingId(null);
  };

  const viewingReceived =
    viewingBooking
      ? (viewingBooking.amountReceivedOnline ?? 0) +
          (viewingBooking.amountReceivedCash ?? 0) ||
        (viewingBooking.amountPaid ?? 0)
      : 0;

  const viewingDiscount =
    viewingBooking &&
    viewingBooking.status === "completed" &&
    viewingBooking.totalPrice - viewingReceived > 0
      ? viewingBooking.totalPrice - viewingReceived
      : 0;

  return (
    <AdminLayout
      title="Bookings"
      description="Manage all bookings"
      onRefresh={() => bookingsQuery.refetch()}
      isLoading={isRefreshing}
      actionButton={
        isAdmin && (
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateBooking}>
            <span className="hidden sm:inline">Create Booking</span>
          </Button>
        )
      }
    >
      <div className="space-y-4">
        <div className="flex flex-col items-stretch gap-3 lg:flex-row lg:items-center lg:gap-4">
          <Input.Search
            placeholder="Search by name, email or booking ID..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            allowClear
            className="w-full flex-1"
          />
          <Space wrap>
            <Segmented
              options={DATE_FILTER_OPTIONS}
              value={dateFilter}
              onChange={(value) => handleDateFilterChange(value as DateFilter)}
            />
            {dateFilter === "range" && (
              <Button
                icon={<CalendarOutlined />}
                onClick={() => setShowRangeModal(true)}
              >
                {customRange?.[0] && customRange?.[1]
                  ? `${customRange[0].format("MMM D, YYYY")} - ${customRange[1].format("MMM D, YYYY")}`
                  : "Select date range"}
              </Button>
            )}
            {(dateFilter !== "all" || activeRange) && (
              <Button
                type="text"
                icon={<CloseOutlined />}
                onClick={() => {
                  setDateFilter("all");
                  setCustomRange(null);
                  setShowRangeModal(false);
                }}
                title="Clear date filter"
              />
            )}
          </Space>
        </div>

        {activeRange && (
          <Text type="secondary" className="text-xs">
            Showing bookings from{" "}
            <span className="font-mono">{activeRange.from}</span> to{" "}
            <span className="font-mono">{activeRange.to}</span>
          </Text>
        )}

        <Card className="border-zinc-800" styles={{ body: { padding: 0 } }}>
          {isInitialLoading ? (
            <AdminTableSkeleton rows={8} columns={8} />
          ) : (
            <>
              <Table<Booking>
                columns={columns}
                dataSource={sortedBookings}
                rowKey="_id"
                scroll={{ x: "max-content" }}
                onChange={handleTableChange}
                locale={{ emptyText: "No bookings found." }}
                pagination={false}
              />
              <div className="flex flex-col gap-3 border-t border-zinc-800 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <Text type="secondary" className="text-xs">
                  Page <span className="font-mono text-zinc-200">{page}</span> of{" "}
                  <span className="font-mono text-zinc-200">{totalPages}</span>{" "}
                  <span className="ml-2">({totalCount} total)</span>
                </Text>
                <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center">
                  <Space size="small">
                    <Text type="secondary" className="text-xs">
                      Rows per page
                    </Text>
                    <Select
                      value={pageSize}
                      onChange={(value) => setPageSize(value)}
                      options={[10, 20, 50, 100].map((n) => ({
                        value: n,
                        label: String(n),
                      }))}
                      style={{ width: 80 }}
                    />
                  </Space>
                  <Pagination
                    current={page}
                    pageSize={pageSize}
                    total={totalCount}
                    onChange={(p, ps) => {
                      setPage(p);
                      if (ps !== pageSize) setPageSize(ps);
                    }}
                    showSizeChanger={false}
                    disabled={isRefreshing}
                  />
                </div>
              </div>
            </>
          )}
        </Card>
      </div>

      <Modal
        title="Booking Details"
        open={showBookingDetailsModal}
        onCancel={closeBookingDetailsModal}
        footer={<Button onClick={closeBookingDetailsModal}>Close</Button>}
        width="min(95vw, 768px)"
        styles={{ body: { maxHeight: "70vh", overflowY: "auto" } }}
      >
        {viewingBooking && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Text type="secondary" className="text-xs">
                  Booking ID
                </Text>
                <p className="font-mono text-sm text-white">
                  #{viewingBooking._id.slice(-8)}
                </p>
              </div>
              <div className="space-y-1">
                <Text type="secondary" className="text-xs">
                  Status
                </Text>
                <div>
                  <Tag color={getStatusTagColor(viewingBooking.status)}>
                    {formatStatusLabel(viewingBooking.status)}
                  </Tag>
                </div>
              </div>
              <div className="space-y-1">
                <Text type="secondary" className="text-xs">
                  User Name
                </Text>
                <p className="text-white">{viewingBooking.userName}</p>
              </div>
              <div className="space-y-1">
                <Text type="secondary" className="text-xs">
                  Email
                </Text>
                <p className="text-sm text-white">{viewingBooking.userEmail}</p>
              </div>
              <div className="space-y-1">
                <Text type="secondary" className="text-xs">
                  Phone
                </Text>
                <p className="text-white">{viewingBooking.userPhone || "N/A"}</p>
              </div>
              <div className="space-y-1">
                <Text type="secondary" className="text-xs">
                  Court
                </Text>
                <p className="text-white">{getCourtName(viewingBooking)}</p>
              </div>
              <div className="space-y-1">
                <Text type="secondary" className="text-xs">
                  Date
                </Text>
                <p className="text-white">
                  {new Date(viewingBooking.date).toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
              <div className="space-y-1">
                <Text type="secondary" className="text-xs">
                  Time
                </Text>
                <p className="text-white">{getEndTimeLabel(viewingBooking)}</p>
              </div>
              <div className="space-y-1">
                <Text type="secondary" className="text-xs">
                  Duration
                </Text>
                <p className="text-white">
                  {viewingBooking.duration} hour
                  {viewingBooking.duration !== 1 ? "s" : ""}
                </p>
              </div>

              {(viewingBooking.status === "confirmed" ||
                viewingBooking.status === "pending_payment") && (
                <div className="space-y-2 pt-1 sm:col-span-2">
                  <Text type="secondary" className="text-xs">
                    Extend Booking
                  </Text>
                  <Space wrap>
                    <Button
                      onClick={() =>
                        handleCheckExtensionAvailability(viewingBooking._id)
                      }
                      loading={
                        extensionCheckBookingId === viewingBooking._id &&
                        extensionLoading.isLoading
                      }
                    >
                      Check availability
                    </Button>
                    {extensionAvailability?.bookingId === viewingBooking._id &&
                      extensionAvailability.checked && (
                        <>
                          <Button
                            onClick={() =>
                              handleExtendBooking(viewingBooking._id, 0.5)
                            }
                            disabled={!extensionAvailability.canExtend30}
                            loading={
                              extendingBookingId === viewingBooking._id &&
                              extendingOption === 0.5
                            }
                          >
                            +30 mins
                          </Button>
                          <Button
                            onClick={() =>
                              handleExtendBooking(viewingBooking._id, 1)
                            }
                            disabled={!extensionAvailability.canExtend60}
                            loading={
                              extendingBookingId === viewingBooking._id &&
                              extendingOption === 1
                            }
                          >
                            +60 mins
                          </Button>
                        </>
                      )}
                  </Space>
                  <Text type="secondary" className="block text-[11px]">
                    Click check first. Only valid extension options will be
                    enabled.
                  </Text>
                </div>
              )}

              {viewingBooking.discountAmount &&
              viewingBooking.discountAmount > 0 ? (
                <div className="col-span-2 space-y-2 rounded-lg bg-zinc-900/50 p-4">
                  <Text type="secondary" className="text-xs">
                    Price Breakdown
                  </Text>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-zinc-400">Subtotal</span>
                      <span className="text-zinc-300">
                        PKR{" "}
                        {(
                          viewingBooking.originalPrice ||
                          viewingBooking.totalPrice +
                            viewingBooking.discountAmount
                        ).toLocaleString()}
                      </span>
                    </div>
                    {viewingBooking.discounts?.map((d, idx: number) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between"
                      >
                        <span className="text-sm text-green-400">
                          {d.name} (
                          {d.type === "percentage"
                            ? `${d.value}%`
                            : `PKR ${d.value}`}
                          )
                        </span>
                        <span className="text-green-400">
                          -PKR {d.amountSaved.toLocaleString()}
                        </span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between border-t border-zinc-700 pt-2">
                      <span className="font-semibold text-white">Total</span>
                      <span className="font-bold text-[#2DD4BF]">
                        PKR {viewingBooking.totalPrice.toLocaleString()}
                      </span>
                    </div>
                    <div className="rounded border border-green-500/30 bg-green-500/10 px-2 py-1 text-center">
                      <span className="text-xs text-green-400">
                        Saved PKR{" "}
                        {viewingBooking.discountAmount.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <Text type="secondary" className="text-xs">
                    Total Price
                  </Text>
                  <p className="font-semibold text-[#2DD4BF]">
                    PKR {viewingBooking.totalPrice.toLocaleString()}
                  </p>
                </div>
              )}

              <div className="space-y-1">
                <Text type="secondary" className="text-xs">
                  Account received
                </Text>
                <p className="font-semibold text-white">
                  PKR {viewingReceived.toLocaleString()}
                </p>
                {((viewingBooking.amountReceivedOnline ?? 0) > 0 ||
                  (viewingBooking.amountReceivedCash ?? 0) > 0) && (
                  <Text type="secondary" className="text-xs">
                    Online: PKR{" "}
                    {(viewingBooking.amountReceivedOnline ?? 0).toLocaleString()}{" "}
                    · Cash: PKR{" "}
                    {(viewingBooking.amountReceivedCash ?? 0).toLocaleString()}
                  </Text>
                )}
              </div>

              {viewingDiscount > 0 && (
                <div className="space-y-1">
                  <Text type="secondary" className="text-xs">
                    Discount (total − received)
                  </Text>
                  <p className="font-semibold text-amber-400">
                    PKR {viewingDiscount.toLocaleString()}
                  </p>
                </div>
              )}

              {viewingReceived < viewingBooking.totalPrice && (
                <div className="space-y-1">
                  <Text type="secondary" className="text-xs">
                    Remaining balance
                  </Text>
                  <p className="font-semibold text-yellow-400">
                    PKR{" "}
                    {(viewingBooking.totalPrice - viewingReceived).toLocaleString()}
                  </p>
                </div>
              )}
            </div>

            <div className="border-t border-zinc-800 pt-6">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div>
                  <Text type="secondary" className="mb-4 block text-xs">
                    Entry Verification QR Code
                  </Text>
                  <div className="flex justify-center lg:justify-start">
                    <div className="inline-block rounded-xl bg-white p-3 sm:p-4">
                      <QRCode
                        value={`${typeof window !== "undefined" ? window.location.origin : ""}/booking/verify/${viewingBooking._id}`}
                        size={160}
                      />
                    </div>
                  </div>
                  <Text type="secondary" className="mt-2 block text-center text-xs lg:text-left">
                    Scan to verify booking entry
                  </Text>
                </div>

                <div>
                  <Text type="secondary" className="mb-4 block text-xs">
                    Feedback QR Code
                  </Text>
                  <div className="flex justify-center lg:justify-start">
                    <div className="inline-block rounded-xl bg-white p-3 sm:p-4">
                      <QRCode
                        value={`${typeof window !== "undefined" ? window.location.origin : ""}/feedback/${viewingBooking._id}`}
                        size={160}
                      />
                    </div>
                  </div>
                  <Text type="secondary" className="mt-2 block text-center text-xs lg:text-left">
                    Share with customer for feedback collection
                  </Text>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        title="Cancel Booking"
        open={showCancelModal}
        onCancel={() => {
          if (isCancelling) return;
          setShowCancelModal(false);
          setCancellingBooking(null);
        }}
        footer={[
          <Button
            key="keep"
            onClick={() => {
              setShowCancelModal(false);
              setCancellingBooking(null);
            }}
            disabled={isCancelling}
          >
            No, Keep Booking
          </Button>,
          <Button
            key="cancel"
            type="primary"
            danger
            loading={isCancelling}
            onClick={confirmCancelBooking}
          >
            Yes, Cancel Booking
          </Button>,
        ]}
      >
        <Text type="secondary">
          Are you sure you want to cancel this booking?
        </Text>
        {cancellingBooking && (
          <div className="mt-4 space-y-4">
            <div className="space-y-2 rounded-lg bg-zinc-900/50 p-4">
              <div className="flex items-center justify-between">
                <Text type="secondary" className="text-sm">
                  Booking ID:
                </Text>
                <span className="font-mono text-sm text-white">
                  #{cancellingBooking._id.slice(-8)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <Text type="secondary" className="text-sm">
                  User:
                </Text>
                <span className="text-sm text-white">
                  {cancellingBooking.userName}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <Text type="secondary" className="text-sm">
                  Date:
                </Text>
                <span className="text-sm text-white">
                  {formatDisplayDate(cancellingBooking.date)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <Text type="secondary" className="text-sm">
                  Time:
                </Text>
                <span className="text-sm text-white">
                  {getEndTimeLabel(cancellingBooking)}
                </span>
              </div>
            </div>
            <Text className="text-sm">
              This action will mark the booking as cancelled. The booking will
              remain in the system but will be marked as cancelled.
            </Text>
          </div>
        )}
      </Modal>

      <Modal
        title="Delete Booking"
        open={showDeleteModal}
        onCancel={() => {
          if (isDeleting) return;
          setShowDeleteModal(false);
          setDeletingBooking(null);
        }}
        footer={[
          <Button
            key="cancel"
            onClick={() => {
              setShowDeleteModal(false);
              setDeletingBooking(null);
            }}
            disabled={isDeleting}
          >
            Cancel
          </Button>,
          <Button
            key="delete"
            type="primary"
            danger
            loading={isDeleting}
            onClick={confirmDeleteBooking}
          >
            Yes, Delete Booking
          </Button>,
        ]}
      >
        <Text type="secondary">
          Are you sure you want to permanently delete this booking? This action
          cannot be undone.
        </Text>
        {deletingBooking && (
          <div className="mt-4 space-y-4">
            <div className="space-y-2 rounded-lg bg-zinc-900/50 p-4">
              <div className="flex items-center justify-between">
                <Text type="secondary" className="text-sm">
                  Booking ID:
                </Text>
                <span className="font-mono text-sm text-white">
                  #{deletingBooking._id.slice(-8)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <Text type="secondary" className="text-sm">
                  User:
                </Text>
                <span className="text-sm text-white">
                  {deletingBooking.userName}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <Text type="secondary" className="text-sm">
                  Email:
                </Text>
                <span className="text-sm text-white">
                  {deletingBooking.userEmail}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <Text type="secondary" className="text-sm">
                  Date:
                </Text>
                <span className="text-sm text-white">
                  {formatDisplayDate(deletingBooking.date)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <Text type="secondary" className="text-sm">
                  Time:
                </Text>
                <span className="text-sm text-white">
                  {getEndTimeLabel(deletingBooking)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <Text type="secondary" className="text-sm">
                  Status:
                </Text>
                <Tag color={getStatusTagColor(deletingBooking.status)}>
                  {formatStatusLabel(deletingBooking.status)}
                </Tag>
              </div>
              <div className="flex items-center justify-between">
                <Text type="secondary" className="text-sm">
                  Total Price:
                </Text>
                <span className="text-sm font-semibold text-[#2DD4BF]">
                  PKR {deletingBooking.totalPrice.toLocaleString()}
                </span>
              </div>
            </div>
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
              <Text type="danger" className="text-sm">
                This will permanently remove the booking from the system. This
                action cannot be undone.
              </Text>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        title="Select custom date range"
        open={showRangeModal}
        onCancel={() => setShowRangeModal(false)}
        footer={
          <Button onClick={() => setShowRangeModal(false)}>Close</Button>
        }
      >
        <Text type="secondary">
          Choose a start and end date to filter bookings.
        </Text>
        <DatePicker.RangePicker
          value={customRange}
          onChange={(dates) => setCustomRange(dates)}
          className="mt-4 w-full"
        />
      </Modal>
    </AdminLayout>
  );
}
