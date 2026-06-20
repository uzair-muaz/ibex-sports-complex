"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { DatePicker } from "@/components/ui/date-picker";
import { AdminAvailableSlotGrid } from "@/components/admin/AdminAvailableSlotGrid";
import { useBusinessTime } from "@/components/booking/hooks/useBusinessTime";
import type { AvailableStartTimeQuote } from "@/app/actions/bookings";
import {
  useAllBookings,
  useAvailableStartTimes,
  useUpdateBookingMutation,
} from "@/hooks/admin/use-bookings";
import { useCourtsByType } from "@/hooks/admin/use-courts";
import { COMPLEX_OPENING_DATE } from "@/types";
import type { Court, Booking } from "@/types";
import { formatLocalDate, formatTime12 } from "@/lib/utils";
import { formatAdminBookingEndLabel } from "@/lib/admin-booking-slots";
import { PriceBreakdown } from "@/components/PriceBreakdown";
import { toast } from "sonner";

function dateKeyToLocalDate(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export default function EditBookingPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const params = useParams();
  const bookingId = params.id as string;

  const { todayBusinessKey, minSelectableDateKey, nowBusinessHourDecimal } =
    useBusinessTime(COMPLEX_OPENING_DATE);

  const minPickDate = useMemo(() => {
    const biz = dateKeyToLocalDate(minSelectableDateKey);
    return COMPLEX_OPENING_DATE > biz ? COMPLEX_OPENING_DATE : biz;
  }, [minSelectableDateKey]);

  const [selectedQuote, setSelectedQuote] =
    useState<AvailableStartTimeQuote | null>(null);

  const userChangedSlotRef = useRef(false);

  const [loadedBooking, setLoadedBooking] = useState<Booking | null>(null);
  const [savedBookingPricing, setSavedBookingPricing] = useState<{
    totalPrice: number;
    originalPrice?: number;
    discountAmount?: number;
  } | null>(null);

  const [formData, setFormData] = useState({
    date: new Date(),
    courtType: "PADEL" as "PADEL" | "CRICKET" | "PICKLEBALL" | "FUTSAL",
    durationHours: 1,
    userName: "",
    userEmail: "",
    userPhone: "",
    status: "pending_payment" as
      | "pending_payment"
      | "confirmed"
      | "cancelled"
      | "completed",
    amountPaid: 0,
    amountReceivedOnline: 0,
    amountReceivedCash: 0,
  });

  const userRole = (session?.user as { role?: string })?.role;
  const isAdmin = userRole === "admin" || userRole === "super_admin";

  const {
    data: allBookings = [],
    isLoading: isLoadingBookingsQuery,
    isFetching: isFetchingBookings,
    isError: isBookingsError,
  } = useAllBookings({
    enabled: !!session && isAdmin && !!bookingId,
  });

  const isLoadingBooking = isLoadingBookingsQuery || isFetchingBookings;

  const { data: courts = [], isLoading: isLoadingCourtsQuery, isFetching: isFetchingCourts } =
    useCourtsByType(formData.courtType, {
      enabled: !!session && isAdmin && !!formData.courtType,
    });

  const isLoadingCourts = isLoadingCourtsQuery || isFetchingCourts;

  const dateString = formatLocalDate(formData.date);

  const availabilityInput =
    loadedBooking && formData.courtType && dateString
      ? {
          courtType: formData.courtType,
          date: dateString,
          duration: formData.durationHours,
          excludeBookingId: bookingId,
        }
      : null;

  const {
    data: rawQuotes = [],
    isLoading: isLoadingQuotesQuery,
    isFetching: isFetchingQuotes,
  } = useAvailableStartTimes(availabilityInput, {
    enabled: !!session && isAdmin && !!loadedBooking,
  });

  const isLoadingQuotes = isLoadingQuotesQuery || isFetchingQuotes;

  const quotableQuotes = useMemo(() => {
    if (!loadedBooking) return [];
    let list = rawQuotes;
    if (dateString === todayBusinessKey) {
      const sameOriginalSlot = (q: AvailableStartTimeQuote) =>
        loadedBooking.date === dateString &&
        q.startTime === loadedBooking.startTime &&
        formData.durationHours === Number(loadedBooking.duration);
      list = list.filter(
        (q) => q.startTime >= nowBusinessHourDecimal || sameOriginalSlot(q),
      );
    }
    return list;
  }, [
    rawQuotes,
    loadedBooking,
    dateString,
    todayBusinessKey,
    formData.durationHours,
    nowBusinessHourDecimal,
  ]);

  const updateBookingMutation = useUpdateBookingMutation();

  const durationPresets = useMemo(() => {
    let presets: { hours: number; label: string }[];
    if (formData.courtType === "FUTSAL") {
      presets = [
        { hours: 1.5, label: "1h 30m" },
        { hours: 2, label: "2h" },
        { hours: 2.5, label: "2h 30m" },
        { hours: 3, label: "3h" },
      ];
    } else {
      presets = [
        { hours: 1, label: "1 hour" },
        { hours: 1.5, label: "1h 30m" },
        { hours: 2, label: "2 hours" },
      ];
    }
    if (loadedBooking) {
      const ld = Number(loadedBooking.duration);
      if (!Number.isNaN(ld) && !presets.some((p) => p.hours === ld)) {
        presets = [...presets, { hours: ld, label: `${ld} hours` }].sort(
          (a, b) => a.hours - b.hours,
        );
      }
    }
    return presets;
  }, [formData.courtType, loadedBooking]);

  useEffect(() => {
    if (session && !isAdmin) {
      router.push("/admin/bookings");
    }
  }, [session, isAdmin, router]);

  useEffect(() => {
    if (!isBookingsError) return;
    toast.error("Failed to load booking");
    router.push("/admin/bookings");
  }, [isBookingsError, router]);

  useEffect(() => {
    if (!session || !isAdmin || !bookingId || loadedBooking || isLoadingBooking)
      return;

    const booking = allBookings.find((b: Booking) => b._id === bookingId);
    if (booking) {
      userChangedSlotRef.current = false;
      setLoadedBooking(booking);
      setSavedBookingPricing({
        totalPrice: Number(booking.totalPrice) || 0,
        originalPrice: booking.originalPrice,
        discountAmount: booking.discountAmount,
      });
      const courtType =
        typeof booking.courtId === "object" &&
        booking.courtId &&
        "type" in booking.courtId
          ? (booking.courtId as Court).type
          : "PADEL";

      const hasNewPaymentFields =
        booking.amountReceivedOnline != null ||
        booking.amountReceivedCash != null;
      const dur = Number(booking.duration);
      setFormData({
        date: new Date(booking.date + "T12:00:00"),
        courtType: courtType as "PADEL" | "CRICKET" | "PICKLEBALL" | "FUTSAL",
        durationHours: dur,
        userName: booking.userName,
        userEmail: booking.userEmail,
        userPhone: booking.userPhone || "",
        status: booking.status,
        amountPaid: booking.amountPaid || 0,
        amountReceivedOnline: hasNewPaymentFields
          ? (booking.amountReceivedOnline ?? 0)
          : 0,
        amountReceivedCash: hasNewPaymentFields
          ? (booking.amountReceivedCash ?? 0)
          : booking.amountPaid || 0,
      });
    } else {
      toast.error("Booking not found");
      router.push("/admin/bookings");
    }
  }, [
    session,
    isAdmin,
    bookingId,
    allBookings,
    loadedBooking,
    isLoadingBooking,
    router,
  ]);

  useEffect(() => {
    setSelectedQuote(null);
  }, [formData.date, formData.courtType, formData.durationHours]);

  useEffect(() => {
    if (userChangedSlotRef.current) return;
    if (!loadedBooking || isLoadingQuotes || quotableQuotes.length === 0)
      return;
    if (dateString !== loadedBooking.date) return;
    if (formData.durationHours !== Number(loadedBooking.duration)) return;
    const courtId =
      typeof loadedBooking.courtId === "object" && loadedBooking.courtId
        ? (loadedBooking.courtId as Court)._id
        : loadedBooking.courtId;
    const match = quotableQuotes.find(
      (q) =>
        q.startTime === loadedBooking.startTime &&
        String(q.assignedCourtId) === String(courtId),
    );
    if (match) setSelectedQuote(match);
  }, [
    loadedBooking,
    quotableQuotes,
    isLoadingQuotes,
    dateString,
    formData.durationHours,
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedQuote) {
      toast.error("Please select a start time");
      return;
    }

    if (!formData.userName || !formData.userEmail || !formData.userPhone) {
      toast.error("Please fill in all user details");
      return;
    }

    try {
      const result = await updateBookingMutation.mutateAsync({
        bookingId,
        courtId: selectedQuote.assignedCourtId,
        date: dateString,
        startTime: selectedQuote.startTime,
        duration: formData.durationHours,
        userName: formData.userName,
        userEmail: formData.userEmail,
        userPhone: formData.userPhone,
        status: formData.status,
        amountReceivedOnline: formData.amountReceivedOnline,
        amountReceivedCash: formData.amountReceivedCash,
      });

      if (result.success) {
        router.replace("/admin/bookings");
      } else {
        toast.error(result.error || "Failed to update booking");
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "An error occurred");
    }
  };

  if (!isAdmin) {
    return null;
  }

  if (isLoadingBooking) {
    return (
      <AdminLayout title="Edit Booking" description="Loading...">
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-12 w-12 animate-spin text-[#2DD4BF]" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Edit Booking" description="Update booking details">
      <div className="p-6 space-y-6">
        <Button
          variant="ghost"
          onClick={() => router.push("/admin/bookings")}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Bookings
        </Button>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date" className="text-zinc-200 text-sm">
                Date
              </Label>
              <DatePicker
                date={formData.date}
                onDateChange={(date) => {
                  if (date) {
                    userChangedSlotRef.current = false;
                    setFormData({ ...formData, date });
                  }
                }}
                variant="admin"
                minDate={minPickDate}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status" className="text-zinc-200 text-sm">
                Status
              </Label>
              <Select
                value={formData.status}
                onValueChange={(v) =>
                  setFormData({
                    ...formData,
                    status: v as typeof formData.status,
                  })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending_payment">
                    Pending Payment
                  </SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-zinc-200 text-sm">Duration</Label>
              <div className="flex flex-wrap gap-2">
                {durationPresets.map((preset) => (
                  <button
                    key={preset.hours}
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        durationHours: preset.hours,
                      })
                    }
                    className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                      formData.durationHours === preset.hours
                        ? "border-teal-400 bg-teal-500/20 text-teal-200"
                        : "border-zinc-700 bg-zinc-900/60 text-zinc-200 hover:border-zinc-500"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <Label className="text-zinc-200 text-sm">
              Available start times
              <span className="ml-2 font-normal text-zinc-500">
                (court assigned automatically; past times today hidden unless
                this booking)
              </span>
            </Label>

            {isLoadingCourts ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-[#2DD4BF]" />
              </div>
            ) : courts.length === 0 ? (
              <p className="text-zinc-400 text-sm py-8 text-center">
                No courts available for this court type.
              </p>
            ) : (
              <AdminAvailableSlotGrid
                quotes={quotableQuotes}
                selectedQuote={selectedQuote}
                durationHours={formData.durationHours}
                courts={courts}
                onSelect={(q) => {
                  userChangedSlotRef.current = true;
                  setSelectedQuote(q);
                }}
                isLoading={isLoadingQuotes}
                emptyMessage="No available slots for this date and duration."
                formatTime12={formatTime12}
                formatEndLabel={(start, dur) =>
                  formatAdminBookingEndLabel(start, dur)
                }
              />
            )}

            {selectedQuote && selectedQuote.totalPrice > 0 && (
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 mt-4 space-y-3">
                <p className="text-zinc-400 text-sm">
                  Pricing for the selected slot (saved on update if time or date
                  changed).
                </p>
                <PriceBreakdown
                  originalPrice={selectedQuote.originalPrice}
                  totalPrice={selectedQuote.totalPrice}
                  discounts={selectedQuote.appliedDiscounts}
                  discountAmount={selectedQuote.discountAmount}
                />
                {savedBookingPricing ? (
                  <p className="text-xs text-zinc-500 pt-1 border-t border-zinc-800">
                    Currently saved on booking: PKR{" "}
                    {savedBookingPricing.totalPrice.toLocaleString()}
                    {selectedQuote.totalPrice !==
                    savedBookingPricing.totalPrice ? (
                      <span className="text-amber-500/90">
                        {" "}
                        — will update after you save if the slot or discounts
                        changed.
                      </span>
                    ) : null}
                  </p>
                ) : null}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">User Details</h3>

            <div className="space-y-2">
              <Label htmlFor="user-name" className="text-zinc-200 text-sm">
                User Name
              </Label>
              <Input
                id="user-name"
                type="text"
                required
                value={formData.userName}
                onChange={(e) =>
                  setFormData({ ...formData, userName: e.target.value })
                }
                className="text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="user-email" className="text-zinc-200 text-sm">
                  Email
                </Label>
                <Input
                  id="user-email"
                  type="email"
                  required
                  value={formData.userEmail}
                  onChange={(e) =>
                    setFormData({ ...formData, userEmail: e.target.value })
                  }
                  className="text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="user-phone" className="text-zinc-200 text-sm">
                  Phone <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="user-phone"
                  type="tel"
                  required
                  value={formData.userPhone}
                  onChange={(e) =>
                    setFormData({ ...formData, userPhone: e.target.value })
                  }
                  placeholder="+92 300 1234567"
                  pattern="[+]?[0-9\s\-()]{10,}"
                  className="text-sm"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">
              Payment Details
            </h3>

            <div className="space-y-3">
              <Label className="text-zinc-200 text-sm block">
                Payment received
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-lg border border-zinc-800 bg-zinc-900/30">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="amount-online"
                    className="text-zinc-400 text-xs"
                  >
                    Received online (PKR)
                  </Label>
                  <Input
                    id="amount-online"
                    type="number"
                    min="0"
                    step="1"
                    value={
                      formData.amountReceivedOnline === 0
                        ? ""
                        : formData.amountReceivedOnline
                    }
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0;
                      const total = value + formData.amountReceivedCash;
                      setFormData((prev) => ({
                        ...prev,
                        amountReceivedOnline: value,
                        amountPaid: total,
                        status:
                          total > 0 && prev.status === "pending_payment"
                            ? "confirmed"
                            : prev.status,
                      }));
                    }}
                    className="text-sm"
                    placeholder="0"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label
                    htmlFor="amount-cash"
                    className="text-zinc-400 text-xs"
                  >
                    Received in cash (PKR)
                  </Label>
                  <Input
                    id="amount-cash"
                    type="number"
                    min="0"
                    step="1"
                    value={
                      formData.amountReceivedCash === 0
                        ? ""
                        : formData.amountReceivedCash
                    }
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0;
                      const total = formData.amountReceivedOnline + value;
                      setFormData((prev) => ({
                        ...prev,
                        amountReceivedCash: value,
                        amountPaid: total,
                        status:
                          total > 0 && prev.status === "pending_payment"
                            ? "confirmed"
                            : prev.status,
                      }));
                    }}
                    className="text-sm"
                    placeholder="0"
                  />
                </div>
                <div className="sm:col-span-2 flex items-center gap-2 pt-1 border-t border-zinc-800">
                  <span className="text-zinc-400 text-xs">
                    Account received (total)
                  </span>
                  <span className="text-[#2DD4BF] font-semibold text-sm">
                    PKR{" "}
                    {(
                      formData.amountReceivedOnline +
                      formData.amountReceivedCash
                    ).toLocaleString()}
                  </span>
                </div>
              </div>
              <p className="text-xs text-zinc-400">
                {formData.amountReceivedOnline + formData.amountReceivedCash >
                  0 && formData.status === "pending_payment"
                  ? 'Status will change to "Confirmed" when saved. Set status to "Completed" when payment is fully settled.'
                  : ""}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-4 pt-4 border-t border-zinc-800">
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.push("/admin/bookings")}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-[#2DD4BF] text-[#0F172A] hover:bg-[#14B8A6]"
              disabled={updateBookingMutation.isPending || !selectedQuote}
            >
              {updateBookingMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Booking"
              )}
            </Button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
