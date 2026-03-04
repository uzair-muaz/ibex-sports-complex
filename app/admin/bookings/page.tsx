"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Eye,
  Loader2,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { QRCode } from "@/components/ui/qr-code";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getAllBookings,
  deleteBooking,
  updateBooking,
} from "../../actions/bookings";
import type { Booking, Court } from "@/types";
import { formatDisplayDate, formatTime12 } from "@/lib/utils";
import {
  getTodayRange,
  getCurrentWeekRange,
  getCurrentMonthRange,
  isDateInRange,
} from "@/lib/date-range-utils";

export default function BookingsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState("");
  const [showBookingDetailsModal, setShowBookingDetailsModal] = useState(false);
  const [viewingBooking, setViewingBooking] = useState<Booking | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancellingBooking, setCancellingBooking] = useState<Booking | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingBooking, setDeletingBooking] = useState<Booking | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [updatingStatusBookingId, setUpdatingStatusBookingId] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<keyof Booking | "courtName" | null>("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "week" | "month">("today");

  const userRole = (session?.user as any)?.role;
  const isSuperAdmin = userRole === "super_admin";
  const isAdmin = userRole === "admin" || isSuperAdmin;

  useEffect(() => {
    if (session) {
      loadData();
    }
  }, [session]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const result = await getAllBookings();
      if (result.success) {
        setBookings(result.bookings);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };


  const handleCancelBooking = (booking: Booking) => {
    if (booking.status === "completed") {
      alert("Completed bookings cannot be cancelled.");
      return;
    }
    setCancellingBooking(booking);
    setShowCancelModal(true);
  };

  const confirmCancelBooking = async () => {
    if (!cancellingBooking) return;

    setIsCancelling(true);
    try {
      const result = await updateBooking({
        bookingId: cancellingBooking._id,
        status: "cancelled",
      });

      if (result.success) {
        setShowCancelModal(false);
        setCancellingBooking(null);
        loadData();
      } else {
        alert(result.error || "Failed to cancel booking");
      }
    } catch (error: any) {
      alert(error.message || "An error occurred");
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
      const result = await deleteBooking(deletingBooking._id);
      if (result.success) {
        setShowDeleteModal(false);
        setDeletingBooking(null);
        loadData();
      } else {
        alert(result.error || "Failed to delete booking");
      }
    } catch (error: any) {
      alert(error.message || "An error occurred");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleStatusChange = async (bookingId: string, newStatus: Booking["status"]) => {
    setUpdatingStatusBookingId(bookingId);
    try {
      const result = await updateBooking({ bookingId, status: newStatus });
      if (result.success) {
        setBookings((prev) =>
          prev.map((b) => (b._id === bookingId ? { ...b, status: newStatus } : b))
        );
        if (viewingBooking?._id === bookingId) {
          setViewingBooking((prev) => (prev ? { ...prev, status: newStatus } : null));
        }
      } else {
        alert(result.error || "Failed to update status");
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setUpdatingStatusBookingId(null);
    }
  };

  const handleViewBooking = (booking: Booking) => {
    setViewingBooking(booking);
    setShowBookingDetailsModal(true);
  };

  const handleEditBooking = (booking: Booking) => {
    router.push(`/admin/bookings/${booking._id}/edit`);
  };

  const handleCreateBooking = () => {
    router.push("/admin/bookings/new");
  };

  const getActiveDateRange = () => {
    const now = new Date();
    if (dateFilter === "today") return getTodayRange(now);
    if (dateFilter === "week") return getCurrentWeekRange(now);
    if (dateFilter === "month") return getCurrentMonthRange(now);
    return null;
  };

  const activeRange = getActiveDateRange();

  const dateFilteredBookings = bookings.filter((b) => {
    if (dateFilter === "all" || !activeRange) return true;
    return isDateInRange(b.date, activeRange);
  });

  const filteredBookings = dateFilteredBookings.filter(
    (b) =>
      b.userName.toLowerCase().includes(filter.toLowerCase()) ||
      b.userEmail.toLowerCase().includes(filter.toLowerCase()) ||
      b._id.includes(filter)
  );

  const handleSort = (column: keyof Booking | "courtName") => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const sortedBookings = [...filteredBookings].sort((a, b) => {
    if (!sortColumn) return 0;

    let aValue: any;
    let bValue: any;

    if (sortColumn === "courtName") {
      aValue = typeof a.courtId === "object" && a.courtId && "name" in a.courtId
        ? (a.courtId as Court).name || "Unknown Court"
        : "Unknown Court";
      bValue = typeof b.courtId === "object" && b.courtId && "name" in b.courtId
        ? (b.courtId as Court).name || "Unknown Court"
        : "Unknown Court";
    } else if (sortColumn === "createdAt" || sortColumn === "updatedAt") {
      // Sort by date fields using actual Date comparison
      const aDate = new Date(a[sortColumn]);
      const bDate = new Date(b[sortColumn]);
      const diff = aDate.getTime() - bDate.getTime();
      return sortDirection === "asc" ? diff : -diff;
    } else if (sortColumn === "date") {
      // Sort by booking date, then by start time within the same day
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
      aValue = a[sortColumn];
      bValue = b[sortColumn];
    }

    // Handle string comparison
    if (typeof aValue === "string" && typeof bValue === "string") {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    // Handle number comparison
    if (typeof aValue === "number" && typeof bValue === "number") {
      return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
    }

    // String comparison
    if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
    if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  const SortIcon = ({ column }: { column: keyof Booking | "courtName" }) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="w-3 h-3 ml-1 opacity-50" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="w-3 h-3 ml-1 text-[#2DD4BF]" />
    ) : (
      <ArrowDown className="w-3 h-3 ml-1 text-[#2DD4BF]" />
    );
  };

  if (!isAdmin) {
    router.push("/admin");
    return null;
  }

  return (
    <AdminLayout
      title="Bookings"
      description="Manage all bookings"
      onRefresh={loadData}
      isLoading={isLoading}
      actionButton={
        isAdmin && (
          <Button
            onClick={handleCreateBooking}
            className="bg-[#2DD4BF] text-[#0F172A] hover:bg-[#14B8A6] text-xs sm:text-sm"
          >
            <Plus className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
            <span className="hidden sm:inline">Create Booking</span>
          </Button>
        )
      }
    >
      <div className="space-y-4">
        <div className="flex flex-col lg:flex-row gap-3 lg:gap-4 items-stretch lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <Input
              type="text"
              placeholder="Search by name, email or booking ID..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full pl-10 text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg border border-zinc-800 bg-zinc-950 p-1 text-xs sm:text-sm">
              {[
                { id: "all", label: "All" },
                { id: "today", label: "Today" },
                { id: "week", label: "This Week" },
                { id: "month", label: "This Month" },
              ].map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() =>
                    setDateFilter(option.id as typeof dateFilter)
                  }
                  className={`px-2.5 py-1.5 rounded-md transition-colors ${
                    dateFilter === option.id
                      ? "bg-[#2DD4BF] text-[#0F172A]"
                      : "text-zinc-300 hover:bg-zinc-900"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {activeRange && (
          <p className="text-xs text-zinc-400">
            Showing bookings from <span className="font-mono">{activeRange.from}</span> to{" "}
            <span className="font-mono">{activeRange.to}</span>
          </p>
        )}

        <Card className="border-zinc-800 bg-zinc-950">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-800">
                    <TableHead className="w-[70px]">
                      <div className="flex items-center">
                        No.
                      </div>
                    </TableHead>
                    <TableHead 
                      className="min-w-[160px] cursor-pointer hover:text-[#2DD4BF] transition-colors"
                      onClick={() => handleSort("userName")}
                    >
                      <div className="flex items-center">
                        User
                        <SortIcon column="userName" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="min-w-[100px] cursor-pointer hover:text-[#2DD4BF] transition-colors"
                      onClick={() => handleSort("courtName")}
                    >
                      <div className="flex items-center">
                        Court
                        <SortIcon column="courtName" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="min-w-[140px] cursor-pointer hover:text-[#2DD4BF] transition-colors"
                      onClick={() => handleSort("date")}
                    >
                      <div className="flex items-center">
                        Date & Time
                        <SortIcon column="date" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="min-w-[100px] cursor-pointer hover:text-[#2DD4BF] transition-colors"
                      onClick={() => handleSort("totalPrice")}
                    >
                      <div className="flex items-center">
                        Booking total
                        <SortIcon column="totalPrice" />
                      </div>
                    </TableHead>
                    <TableHead className="min-w-[160px]">
                      Received & discount
                    </TableHead>
                    <TableHead 
                      className="min-w-[100px] cursor-pointer hover:text-[#2DD4BF] transition-colors"
                      onClick={() => handleSort("status")}
                    >
                      <div className="flex items-center">
                        Status
                        <SortIcon column="status" />
                      </div>
                    </TableHead>
                    <TableHead className="text-right min-w-[140px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <>
                      {[...Array(5)].map((_, i) => (
                        <TableRow key={i} className="border-zinc-800">
                          <TableCell><Skeleton className="h-4 w-10" /></TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-32 mb-2" />
                            <Skeleton className="h-3 w-40" />
                          </TableCell>
                          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-24 mb-2" />
                            <Skeleton className="h-3 w-32" />
                          </TableCell>
                          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                          <TableCell>
                            <div className="flex gap-2 justify-end">
                              <Skeleton className="h-8 w-8 rounded" />
                              <Skeleton className="h-8 w-8 rounded" />
                              <Skeleton className="h-8 w-8 rounded" />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </>
                  ) : sortedBookings.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="text-center text-zinc-400 py-8"
                      >
                        No bookings found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedBookings.map((booking) => {
                      const courtName =
                        typeof booking.courtId === "object" &&
                        booking.courtId &&
                        "name" in booking.courtId
                          ? (booking.courtId as Court).name || "Unknown Court"
                          : "Unknown Court";

                      return (
                        <TableRow
                          key={booking._id}
                          className="border-zinc-800"
                        >
                          <TableCell className="font-mono text-zinc-400 text-xs">
                            {typeof booking.serialNumber === "number"
                              ? booking.serialNumber.toString().padStart(3, "0")
                              : "—"}
                          </TableCell>
                          <TableCell className="text-zinc-200 text-sm">
                            <div className="font-medium text-white">
                              {booking.userName}
                            </div>
                            <div className="text-zinc-400 text-xs truncate max-w-[180px]" title={booking.userEmail}>
                              {booking.userEmail}
                            </div>
                            <div className="text-zinc-500 text-xs">
                              {booking.userPhone || "—"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className="bg-zinc-900/50 border-zinc-800 text-zinc-200 text-xs"
                            >
                              {courtName}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-zinc-200 text-sm">
                            <div>{formatDisplayDate(booking.date)}</div>
                            <div className="text-xs text-zinc-400">
                              {formatTime12(booking.startTime)} – {formatTime12(booking.startTime + booking.duration)}
                            </div>
                          </TableCell>
                          <TableCell className="text-zinc-200 text-sm">
                            <span className="text-[#2DD4BF] font-semibold">
                              PKR {booking.totalPrice.toLocaleString()}
                            </span>
                          </TableCell>
                          <TableCell className="text-zinc-200 text-sm align-top">
                            {(() => {
                              const online = booking.amountReceivedOnline ?? 0;
                              const cash = booking.amountReceivedCash ?? 0;
                              const received = online + cash > 0 ? online + cash : (booking.amountPaid ?? 0);
                              const discount = booking.status === "completed" && booking.totalPrice - received > 0
                                ? booking.totalPrice - received
                                : 0;
                              const hasBreakdown = online > 0 || cash > 0;
                              return (
                                <div className="space-y-1 text-xs">
                                  {hasBreakdown ? (
                                    <div className="text-zinc-400">
                                      Online {online.toLocaleString()} + Cash {cash.toLocaleString()}
                                    </div>
                                  ) : null}
                                  <div className="text-white font-medium">
                                    Total {received.toLocaleString()}
                                  </div>
                                  {discount > 0 && (
                                    <div className="text-amber-400">
                                      Discount {discount.toLocaleString()}
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </TableCell>
                          <TableCell>
                            <Select
                              value={booking.status}
                              onValueChange={(value) => handleStatusChange(booking._id, value as Booking["status"])}
                              disabled={updatingStatusBookingId === booking._id}
                            >
                              <SelectTrigger
                                className={`w-[165px] min-w-[165px] h-8 text-xs border ${
                                  booking.status === "confirmed"
                                    ? "border-[#2DD4BF]/50 text-[#2DD4BF] bg-[#2DD4BF]/10"
                                    : booking.status === "pending_payment"
                                      ? "border-yellow-500/50 text-yellow-400 bg-yellow-500/10"
                                      : booking.status === "cancelled"
                                        ? "border-red-500/50 text-red-400 bg-red-500/10"
                                        : booking.status === "completed"
                                          ? "border-green-500/50 text-green-400 bg-green-500/10"
                                          : "border-zinc-600 text-zinc-300 bg-zinc-800/50"
                                }`}
                              >
                                <SelectValue />
                                {updatingStatusBookingId === booking._id && (
                                  <Loader2 className="w-3 h-3 animate-spin ml-1 shrink-0" />
                                )}
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending_payment">Pending Payment</SelectItem>
                                <SelectItem value="confirmed">Confirmed</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                                <SelectItem value="cancelled">Cancelled</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleViewBooking(booking)}
                                className="text-zinc-400 hover:text-[#2DD4BF] h-8 w-8"
                                title="View Details"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditBooking(booking)}
                                className="text-zinc-400 hover:text-[#2DD4BF] h-8 w-8"
                                title="Edit"
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              {(booking.status === "confirmed" || booking.status === "pending_payment") && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleCancelBooking(booking)}
                                  className="text-zinc-400 hover:text-red-400 h-8 w-8"
                                  title="Cancel Booking"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              )}
                              {isSuperAdmin && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteBooking(booking)}
                                  className="text-zinc-400 hover:text-red-400 h-8 w-8"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Booking Details Modal */}
      <Dialog open={showBookingDetailsModal} onOpenChange={setShowBookingDetailsModal}>
        <DialogContent className="bg-zinc-950 border-zinc-800 max-w-[95vw] sm:max-w-2xl text-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">Booking Details</DialogTitle>
            <DialogDescription className="text-zinc-400">
              View complete booking information and QR code
            </DialogDescription>
          </DialogHeader>
          {viewingBooking && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-zinc-400 text-xs">Booking ID</Label>
                  <p className="text-white font-mono text-sm">#{viewingBooking._id.slice(-8)}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-zinc-400 text-xs">Status</Label>
                  <Badge
                    variant="outline"
                    className={
                      viewingBooking.status === "confirmed"
                        ? "bg-[#2DD4BF]/20 border-[#2DD4BF]/50 text-[#2DD4BF]"
                        : viewingBooking.status === "pending_payment"
                          ? "bg-yellow-500/20 border-yellow-500/50 text-yellow-400"
                          : viewingBooking.status === "cancelled"
                            ? "bg-red-500/20 border-red-500/50 text-red-400"
                            : viewingBooking.status === "completed"
                              ? "bg-green-500/20 border-green-500/50 text-green-400"
                              : "bg-zinc-800 border-zinc-700 text-zinc-300"
                    }
                  >
                    {viewingBooking.status === "pending_payment" 
                      ? "Pending Payment"
                      : viewingBooking.status.charAt(0).toUpperCase() + viewingBooking.status.slice(1).replace(/_/g, " ")}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <Label className="text-zinc-400 text-xs">User Name</Label>
                  <p className="text-white">{viewingBooking.userName}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-zinc-400 text-xs">Email</Label>
                  <p className="text-white text-sm">{viewingBooking.userEmail}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-zinc-400 text-xs">Phone</Label>
                  <p className="text-white">{viewingBooking.userPhone || "N/A"}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-zinc-400 text-xs">Court</Label>
                  <p className="text-white">
                    {typeof viewingBooking.courtId === "object" &&
                    viewingBooking.courtId &&
                    "name" in viewingBooking.courtId
                      ? (viewingBooking.courtId as Court).name || "Unknown Court"
                      : "Unknown Court"}
                  </p>
                </div>
                <div className="space-y-1">
                  <Label className="text-zinc-400 text-xs">Date</Label>
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
                  <Label className="text-zinc-400 text-xs">Time</Label>
                  <p className="text-white">
                    {formatTime12(viewingBooking.startTime)} – {formatTime12(viewingBooking.startTime + viewingBooking.duration)}
                  </p>
                </div>
                <div className="space-y-1">
                  <Label className="text-zinc-400 text-xs">Duration</Label>
                  <p className="text-white">{viewingBooking.duration} hour{viewingBooking.duration !== 1 ? "s" : ""}</p>
                </div>
                {/* Price Breakdown */}
                {viewingBooking.discountAmount && viewingBooking.discountAmount > 0 ? (
                  <div className="col-span-2 space-y-2 bg-zinc-900/50 rounded-lg p-4">
                    <Label className="text-zinc-400 text-xs">Price Breakdown</Label>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-400 text-sm">Subtotal</span>
                        <span className="text-zinc-300">PKR {(viewingBooking.originalPrice || viewingBooking.totalPrice + viewingBooking.discountAmount).toLocaleString()}</span>
                      </div>
                      {viewingBooking.discounts?.map((d: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center">
                          <span className="text-green-400 text-sm">{d.name} ({d.type === 'percentage' ? `${d.value}%` : `PKR ${d.value}`})</span>
                          <span className="text-green-400">-PKR {d.amountSaved.toLocaleString()}</span>
                        </div>
                      ))}
                      <div className="flex justify-between items-center pt-2 border-t border-zinc-700">
                        <span className="text-white font-semibold">Total</span>
                        <span className="text-[#2DD4BF] font-bold">PKR {viewingBooking.totalPrice.toLocaleString()}</span>
                      </div>
                      <div className="bg-green-500/10 border border-green-500/30 rounded px-2 py-1 text-center">
                        <span className="text-green-400 text-xs">Saved PKR {viewingBooking.discountAmount.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <Label className="text-zinc-400 text-xs">Total Price</Label>
                    <p className="text-[#2DD4BF] font-semibold">PKR {viewingBooking.totalPrice.toLocaleString()}</p>
                  </div>
                )}
                <div className="space-y-1">
                  <Label className="text-zinc-400 text-xs">Account received</Label>
                  <p className="text-white font-semibold">
                    PKR{" "}
                    {(
                      (viewingBooking.amountReceivedOnline ?? 0) +
                      (viewingBooking.amountReceivedCash ?? 0) ||
                      (viewingBooking.amountPaid ?? 0)
                    ).toLocaleString()}
                  </p>
                  {((viewingBooking.amountReceivedOnline ?? 0) > 0 ||
                    (viewingBooking.amountReceivedCash ?? 0) > 0) && (
                    <p className="text-zinc-500 text-xs">
                      Online: PKR {(viewingBooking.amountReceivedOnline ?? 0).toLocaleString()} · Cash: PKR {(viewingBooking.amountReceivedCash ?? 0).toLocaleString()}
                    </p>
                  )}
                </div>
                {(() => {
                  const received =
                    (viewingBooking.amountReceivedOnline ?? 0) +
                    (viewingBooking.amountReceivedCash ?? 0) ||
                    (viewingBooking.amountPaid ?? 0);
                  const discount = viewingBooking.status === "completed" && viewingBooking.totalPrice - received > 0
                    ? viewingBooking.totalPrice - received
                    : 0;
                  return discount > 0 ? (
                    <div className="space-y-1">
                      <Label className="text-zinc-400 text-xs">Discount (total − received)</Label>
                      <p className="text-amber-400 font-semibold">PKR {discount.toLocaleString()}</p>
                    </div>
                  ) : null;
                })()}
                {(() => {
                  const received =
                    (viewingBooking.amountReceivedOnline ?? 0) +
                    (viewingBooking.amountReceivedCash ?? 0) ||
                    (viewingBooking.amountPaid ?? 0);
                  return received < viewingBooking.totalPrice ? (
                    <div className="space-y-1">
                      <Label className="text-zinc-400 text-xs">Remaining balance</Label>
                      <p className="text-yellow-400 font-semibold">
                        PKR {(viewingBooking.totalPrice - received).toLocaleString()}
                      </p>
                    </div>
                  ) : null;
                })()}
              </div>

              {/* QR Codes */}
              <div className="border-t border-zinc-800 pt-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <Label className="text-zinc-400 text-xs mb-4 block">Entry Verification QR Code</Label>
                    <div className="flex justify-center lg:justify-start">
                      <div className="bg-white p-3 sm:p-4 rounded-xl inline-block">
                        <QRCode
                          value={`${typeof window !== "undefined" ? window.location.origin : ""}/booking/verify/${viewingBooking._id}`}
                          size={160}
                        />
                      </div>
                    </div>
                    <p className="text-xs text-zinc-500 mt-2 text-center lg:text-left">
                      Scan to verify booking entry
                    </p>
                  </div>
                  
                  <div>
                    <Label className="text-zinc-400 text-xs mb-4 block">Feedback QR Code</Label>
                    <div className="flex justify-center lg:justify-start">
                      <div className="bg-white p-3 sm:p-4 rounded-xl inline-block">
                        <QRCode
                          value={`${typeof window !== "undefined" ? window.location.origin : ""}/feedback/${viewingBooking._id}`}
                          size={160}
                        />
                      </div>
                    </div>
                    <p className="text-xs text-zinc-500 mt-2 text-center lg:text-left">
                      Share with customer for feedback collection
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setShowBookingDetailsModal(false);
                setViewingBooking(null);
              }}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Booking Confirmation Modal */}
      <Dialog open={showCancelModal} onOpenChange={setShowCancelModal}>
        <DialogContent className="bg-zinc-950 border-zinc-800 max-w-md text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Cancel Booking</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Are you sure you want to cancel this booking?
            </DialogDescription>
          </DialogHeader>
          {cancellingBooking && (
            <div className="space-y-4 py-4">
              <div className="bg-zinc-900/50 rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400 text-sm">Booking ID:</span>
                  <span className="text-white font-mono text-sm">
                    #{cancellingBooking._id.slice(-8)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400 text-sm">User:</span>
                  <span className="text-white text-sm">{cancellingBooking.userName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400 text-sm">Date:</span>
                  <span className="text-white text-sm">{formatDisplayDate(cancellingBooking.date)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400 text-sm">Time:</span>
                  <span className="text-white text-sm">
                    {formatTime12(cancellingBooking.startTime)} – {formatTime12(cancellingBooking.startTime + cancellingBooking.duration)}
                  </span>
                </div>
              </div>
              <p className="text-zinc-300 text-sm">
                This action will mark the booking as cancelled. The booking will remain in the system but will be marked as cancelled.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setShowCancelModal(false);
                setCancellingBooking(null);
              }}
              disabled={isCancelling}
            >
              No, Keep Booking
            </Button>
            <Button
              onClick={confirmCancelBooking}
              className="bg-red-500 text-white hover:bg-red-600"
              disabled={isCancelling}
            >
              {isCancelling ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Cancelling...
                </>
              ) : (
                "Yes, Cancel Booking"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Booking Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="bg-zinc-950 border-zinc-800 max-w-md text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Delete Booking</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Are you sure you want to permanently delete this booking? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deletingBooking && (
            <div className="space-y-4 py-4">
              <div className="bg-zinc-900/50 rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400 text-sm">Booking ID:</span>
                  <span className="text-white font-mono text-sm">
                    #{deletingBooking._id.slice(-8)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400 text-sm">User:</span>
                  <span className="text-white text-sm">{deletingBooking.userName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400 text-sm">Email:</span>
                  <span className="text-white text-sm">{deletingBooking.userEmail}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400 text-sm">Date:</span>
                  <span className="text-white text-sm">{formatDisplayDate(deletingBooking.date)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400 text-sm">Time:</span>
                  <span className="text-white text-sm">
                    {formatTime12(deletingBooking.startTime)} – {formatTime12(deletingBooking.startTime + deletingBooking.duration)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400 text-sm">Status:</span>
                  <Badge
                    variant="outline"
                    className={
                      deletingBooking.status === "confirmed"
                        ? "bg-[#2DD4BF]/20 border-[#2DD4BF]/50 text-[#2DD4BF] text-xs"
                        : deletingBooking.status === "pending_payment"
                          ? "bg-yellow-500/20 border-yellow-500/50 text-yellow-400 text-xs"
                          : deletingBooking.status === "cancelled"
                            ? "bg-red-500/20 border-red-500/50 text-red-400 text-xs"
                            : deletingBooking.status === "completed"
                              ? "bg-green-500/20 border-green-500/50 text-green-400 text-xs"
                              : "bg-zinc-800 border-zinc-700 text-zinc-300 text-xs"
                    }
                  >
                    {deletingBooking.status === "pending_payment"
                      ? "Pending Payment"
                      : deletingBooking.status.charAt(0).toUpperCase() + deletingBooking.status.slice(1).replace(/_/g, " ")}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400 text-sm">Total Price:</span>
                  <span className="text-[#2DD4BF] font-semibold text-sm">
                    PKR {deletingBooking.totalPrice.toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                <p className="text-red-400 text-sm">
                  This will permanently remove the booking from the system. This action cannot be undone.
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setShowDeleteModal(false);
                setDeletingBooking(null);
              }}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmDeleteBooking}
              className="bg-red-500 text-white hover:bg-red-600"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Yes, Delete Booking"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
