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
import { AdminLayout } from "@/components/admin/AdminLayout";
import { QRCode } from "@/components/ui/qr-code";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getAllBookings,
  deleteBooking,
  updateBooking,
} from "../../actions/bookings";
import type { Booking, Court } from "@/types";

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
  const [sortColumn, setSortColumn] = useState<keyof Booking | "courtName" | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

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

  const handleDeleteBooking = async (id: string) => {
    if (
      window.confirm(
        "Are you sure you want to permanently delete this booking? This action cannot be undone."
      )
    ) {
      const result = await deleteBooking(id);
      if (result.success) {
        loadData();
      } else {
        alert(result.error || "Failed to delete booking");
      }
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

  const filteredBookings = bookings.filter(
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
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
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
        </div>

        <Card className="border-zinc-800 bg-zinc-950">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-800">
                    <TableHead 
                      className="min-w-[100px] cursor-pointer hover:text-[#2DD4BF] transition-colors"
                      onClick={() => handleSort("_id")}
                    >
                      <div className="flex items-center">
                        Booking ID
                        <SortIcon column="_id" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="min-w-[150px] cursor-pointer hover:text-[#2DD4BF] transition-colors"
                      onClick={() => handleSort("userName")}
                    >
                      <div className="flex items-center">
                        User
                        <SortIcon column="userName" />
                      </div>
                    </TableHead>
                    <TableHead className="min-w-[120px]">Contact</TableHead>
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
                      className="min-w-[150px] cursor-pointer hover:text-[#2DD4BF] transition-colors"
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
                        Price
                        <SortIcon column="totalPrice" />
                      </div>
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
                          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-32 mb-2" />
                            <Skeleton className="h-3 w-40" />
                          </TableCell>
                          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-24 mb-2" />
                            <Skeleton className="h-3 w-32" />
                          </TableCell>
                          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
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
                          <TableCell className="font-mono text-zinc-400 text-sm">
                            #{booking._id.slice(-8)}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-white text-sm">
                              {booking.userName}
                            </div>
                            <div className="text-zinc-400 text-xs">
                              {booking.userEmail}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-zinc-200 text-sm">
                              {booking.userPhone || "N/A"}
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
                            <div>{booking.date}</div>
                            <div className="text-xs text-zinc-400">
                              {Math.floor(booking.startTime)
                                .toString()
                                .padStart(2, "0")}
                              :{booking.startTime % 1 === 0 ? "00" : "30"} -{" "}
                              {Math.floor(booking.startTime + booking.duration)
                                .toString()
                                .padStart(2, "0")}
                              :{(booking.startTime + booking.duration) % 1 === 0 ? "00" : "30"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-[#2DD4BF] font-semibold text-sm">
                              PKR {booking.totalPrice.toFixed(2)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                booking.status === "confirmed"
                                  ? "bg-[#2DD4BF]/20 border-[#2DD4BF]/50 text-[#2DD4BF] text-xs"
                                  : booking.status === "pending_payment"
                                    ? "bg-yellow-500/20 border-yellow-500/50 text-yellow-400 text-xs"
                                    : booking.status === "cancelled"
                                      ? "bg-red-500/20 border-red-500/50 text-red-400 text-xs"
                                      : booking.status === "completed"
                                        ? "bg-green-500/20 border-green-500/50 text-green-400 text-xs"
                                        : "bg-zinc-800 border-zinc-700 text-zinc-300 text-xs"
                              }
                            >
                              {booking.status === "pending_payment" 
                                ? "Pending Payment"
                                : booking.status.charAt(0).toUpperCase() + booking.status.slice(1).replace(/_/g, " ")}
                            </Badge>
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
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteBooking(booking._id)}
                                className="text-zinc-400 hover:text-red-400 h-8 w-8"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
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
                    {Math.floor(viewingBooking.startTime)
                      .toString()
                      .padStart(2, "0")}
                    :{viewingBooking.startTime % 1 === 0 ? "00" : "30"} -{" "}
                    {Math.floor(viewingBooking.startTime + viewingBooking.duration)
                      .toString()
                      .padStart(2, "0")}
                    :{(viewingBooking.startTime + viewingBooking.duration) % 1 === 0 ? "00" : "30"}
                  </p>
                </div>
                <div className="space-y-1">
                  <Label className="text-zinc-400 text-xs">Duration</Label>
                  <p className="text-white">{viewingBooking.duration} hour{viewingBooking.duration !== 1 ? "s" : ""}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-zinc-400 text-xs">Total Price</Label>
                  <p className="text-[#2DD4BF] font-semibold">PKR {viewingBooking.totalPrice.toFixed(2)}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-zinc-400 text-xs">Amount Paid</Label>
                  <p className="text-white font-semibold">PKR {(viewingBooking.amountPaid || 0).toFixed(2)}</p>
                </div>
                {(viewingBooking.amountPaid || 0) < viewingBooking.totalPrice && (
                  <div className="space-y-1">
                    <Label className="text-zinc-400 text-xs">Remaining Balance</Label>
                    <p className="text-yellow-400 font-semibold">PKR {(viewingBooking.totalPrice - (viewingBooking.amountPaid || 0)).toFixed(2)}</p>
                  </div>
                )}
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
                  <span className="text-white text-sm">{cancellingBooking.date}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400 text-sm">Time:</span>
                  <span className="text-white text-sm">
                    {Math.floor(cancellingBooking.startTime)
                      .toString()
                      .padStart(2, "0")}
                    :00 -{" "}
                    {(cancellingBooking.startTime + cancellingBooking.duration)
                      .toString()
                      .padStart(2, "0")}
                    :00
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
    </AdminLayout>
  );
}
