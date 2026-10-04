"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { App, Button, Card, Table } from "antd";
import type { TableProps } from "antd/es/table";
import type { Dayjs } from "dayjs";
import { PlusOutlined } from "@ant-design/icons";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminTableSkeleton } from "@/components/admin/loaders";
import { BookingViewModal } from "@/components/admin/bookings/BookingViewModal";
import { BookingCancelModal } from "@/components/admin/bookings/BookingCancelModal";
import { BookingDeleteModal } from "@/components/admin/bookings/BookingDeleteModal";
import { BookingRangeModal } from "@/components/admin/bookings/BookingRangeModal";
import { BookingFiltersBar } from "@/components/admin/bookings/BookingFiltersBar";
import { BookingTableFooter } from "@/components/admin/bookings/BookingTableFooter";
import { getBookingTableColumns } from "@/components/admin/bookings/BookingTableColumns";
import {
  sortBookings,
  type DateFilter,
  type SortColumn,
} from "@/components/admin/bookings/bookingDisplay";
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
import type { Booking } from "@/types";
import {
  getTodayRange,
  getCurrentWeekRange,
  getCurrentMonthRange,
  getRangeFromDates,
} from "@/lib/date-range-utils";

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
  }, [dateFilter, customRange, debouncedFilter, pageSize]);

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

  const columns = useMemo(
    () =>
      getBookingTableColumns({
        sortColumn,
        sortDirection,
        updatingStatusBookingId,
        isSuperAdmin,
        onStatusChange: handleStatusChange,
        onView: handleViewBooking,
        onEdit: handleEditBooking,
        onCancel: handleCancelBooking,
        onDelete: handleDeleteBooking,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sortColumn, sortDirection, updatingStatusBookingId, isSuperAdmin],
  );

  if (!isAdmin) {
    router.push("/admin");
    return null;
  }

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
        <BookingFiltersBar
          filter={filter}
          onFilterChange={setFilter}
          dateFilter={dateFilter}
          onDateFilterChange={handleDateFilterChange}
          customRange={customRange}
          activeRange={activeRange}
          onOpenRangeModal={() => setShowRangeModal(true)}
          onClearDateFilter={() => {
            setDateFilter("all");
            setCustomRange(null);
            setShowRangeModal(false);
          }}
        />

        <Card className="border-[var(--ant-color-border)]" styles={{ body: { padding: 0 } }}>
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
              <BookingTableFooter
                page={page}
                pageSize={pageSize}
                totalCount={totalCount}
                totalPages={totalPages}
                disabled={isRefreshing}
                onPageChange={(p, ps) => {
                  setPage(p);
                  if (ps !== pageSize) setPageSize(ps);
                }}
                onPageSizeChange={setPageSize}
              />
            </>
          )}
        </Card>
      </div>

      <BookingViewModal
        booking={viewingBooking}
        open={showBookingDetailsModal}
        onClose={() => {
          setShowBookingDetailsModal(false);
          setViewingBooking(null);
          setExtensionCheckBookingId(null);
        }}
        extensionCheckBookingId={extensionCheckBookingId}
        extensionLoading={extensionLoading.isLoading}
        extensionAvailability={extensionAvailability}
        extendingBookingId={extendingBookingId}
        extendingOption={extendingOption}
        onCheckExtensionAvailability={handleCheckExtensionAvailability}
        onExtendBooking={handleExtendBooking}
      />

      <BookingCancelModal
        booking={cancellingBooking}
        open={showCancelModal}
        isCancelling={isCancelling}
        onClose={() => {
          setShowCancelModal(false);
          setCancellingBooking(null);
        }}
        onConfirm={confirmCancelBooking}
      />

      <BookingDeleteModal
        booking={deletingBooking}
        open={showDeleteModal}
        isDeleting={isDeleting}
        onClose={() => {
          setShowDeleteModal(false);
          setDeletingBooking(null);
        }}
        onConfirm={confirmDeleteBooking}
      />

      <BookingRangeModal
        open={showRangeModal}
        value={customRange}
        onChange={setCustomRange}
        onClose={() => setShowRangeModal(false)}
      />
    </AdminLayout>
  );
}
