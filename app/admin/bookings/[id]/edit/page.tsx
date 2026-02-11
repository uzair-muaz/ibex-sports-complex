"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Loader2, CheckCircle } from "lucide-react";
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
import { motion } from "framer-motion";
import { getCourts } from "../../../../actions/courts";
import {
  getBookingsByDate,
  updateBooking,
  getAllBookings,
} from "../../../../actions/bookings";
import { OPERATING_HOURS, COMPLEX_OPENING_DATE } from "@/types";
import type { Court, Booking, CourtPricingPeriod } from "@/types";
import { formatLocalDate } from "@/lib/utils";

export default function EditBookingPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const params = useParams();
  const bookingId = params.id as string;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingBooking, setIsLoadingBooking] = useState(true);

  // Slot selection state
  const [courts, setCourts] = useState<Court[]>([]);
  const [dateBookings, setDateBookings] = useState<any[]>([]);
  const [selectedSlots, setSelectedSlots] = useState<
    { courtId: string; slotTime: number }[]
  >([]);
  const [isLoadingCourts, setIsLoadingCourts] = useState(false);
  const [isLoadingDateBookings, setIsLoadingDateBookings] = useState(false);

  const [formData, setFormData] = useState({
    date: new Date(),
    courtType: "PADEL" as "PADEL" | "CRICKET" | "PICKLEBALL" | "FUTSAL",
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

  const userRole = (session?.user as any)?.role;
  const isAdmin = userRole === "admin" || userRole === "super_admin";

  useEffect(() => {
    if (session && !isAdmin) {
      router.push("/admin/bookings");
    }
  }, [session, isAdmin, router]);

  useEffect(() => {
    if (session && isAdmin && bookingId) {
      loadBooking();
    }
  }, [session, isAdmin, bookingId]);

  useEffect(() => {
    if (session && isAdmin && formData.courtType) {
      loadCourts();
    }
  }, [session, isAdmin, formData.courtType]);

  useEffect(() => {
    if (session && isAdmin && formData.date) {
      loadBookingsForDate();
    }
  }, [session, isAdmin, formData.date]);

  useEffect(() => {
    // Pre-select slots when booking and courts are loaded
    if (courts.length > 0 && !isLoadingBooking && !isLoadingCourts) {
      loadBookingForSlots();
    }
  }, [courts, isLoadingBooking, isLoadingCourts]);

  const loadBooking = async () => {
    setIsLoadingBooking(true);
    try {
      const result = await getAllBookings();
      if (result.success) {
        const booking = result.bookings.find(
          (b: Booking) => b._id === bookingId,
        );
        if (booking) {
          const courtType =
            typeof booking.courtId === "object" &&
            booking.courtId &&
            "type" in booking.courtId
              ? (booking.courtId as Court).type
              : "PADEL";

          const hasNewPaymentFields =
            booking.amountReceivedOnline != null ||
            booking.amountReceivedCash != null;
          setFormData({
            date: new Date(booking.date),
            courtType: courtType as
              | "PADEL"
              | "CRICKET"
              | "PICKLEBALL"
              | "FUTSAL",
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
              : (booking.amountPaid || 0),
          });
        } else {
          alert("Booking not found");
          router.push("/admin/bookings");
        }
      }
    } catch (error) {
      console.error(error);
      alert("Failed to load booking");
      router.push("/admin/bookings");
    } finally {
      setIsLoadingBooking(false);
    }
  };

  const loadBookingForSlots = async () => {
    try {
      const result = await getAllBookings();
      if (result.success) {
        const booking = result.bookings.find(
          (b: Booking) => b._id === bookingId,
        );
        if (booking && courts.length > 0) {
          const court = courts.find((c) => {
            if (typeof booking.courtId === "string") {
              return c._id === booking.courtId;
            }
            return (booking.courtId as any)?._id === c._id;
          });

          if (court) {
            const slots: { courtId: string; slotTime: number }[] = [];
            for (let i = 0; i < booking.duration * 2; i++) {
              slots.push({
                courtId: court._id,
                slotTime: booking.startTime + i * 0.5,
              });
            }
            setSelectedSlots(slots);
          }
        }
      }
    } catch (error) {
      console.error(error);
    }
  };

  const loadCourts = async () => {
    setIsLoadingCourts(true);
    try {
      const result = await getCourts(formData.courtType);
      if (result.success) {
        setCourts(result.courts);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoadingCourts(false);
    }
  };

  const loadBookingsForDate = async () => {
    setIsLoadingDateBookings(true);
    try {
      const dateString =
        formData.date instanceof Date
          ? formatLocalDate(formData.date)
          : formData.date;
      const result = await getBookingsByDate(dateString);
      if (result.success) {
        const filtered = result.bookings.filter(
          (b: any) =>
            b.courtId?.type === formData.courtType &&
            b.status !== "cancelled" &&
            b._id !== bookingId, // Exclude current booking
        );
        setDateBookings(filtered);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoadingDateBookings(false);
    }
  };

  // Generate time slots for business hours: 12:00 PM - 2:00 AM
  const timeSlots: number[] = [];
  for (let hour = 12; hour < 24; hour++) {
    timeSlots.push(hour);
    timeSlots.push(hour + 0.5);
  }
  for (let hour = 0; hour < 2; hour++) {
    timeSlots.push(hour);
    timeSlots.push(hour + 0.5);
  }

  const formatTime12 = (time: number) => {
    const totalMinutes = Math.round(time * 60);
    let h = Math.floor(totalMinutes / 60) % 24;
    const m = totalMinutes % 60;
    const suffix = h >= 12 ? "PM" : "AM";
    const displayHour = h % 12 === 0 ? 12 : h % 12;
    const minuteStr = m.toString().padStart(2, "0");
    return `${displayHour}:${minuteStr} ${suffix}`;
  };

  const formatPeriodTime = (period: CourtPricingPeriod) => {
    if (period.allDay) return "All day";
    return `${formatTime12(period.startHour)} - ${formatTime12(period.endHour)}`;
  };

  const isSlotBooked = (courtId: string, slotTime: number) => {
    return dateBookings.some((b) => {
      const bookingCourtId =
        typeof b.courtId === "object" ? (b.courtId as any)._id : b.courtId;
      if (bookingCourtId !== courtId) return false;

      const bookingStart = b.startTime;
      const bookingEnd = b.startTime + b.duration;

      return slotTime >= bookingStart && slotTime < bookingEnd;
    });
  };

  const isSlotSelected = (courtId: string, slotTime: number) => {
    return selectedSlots.some(
      (s) => s.courtId === courtId && s.slotTime === slotTime,
    );
  };

  const isSlotConsecutive = (courtId: string, slotTime: number) => {
    if (selectedSlots.length === 0) return true;
    if (selectedSlots[0].courtId !== courtId) return false;

    const sortedTimes = selectedSlots
      .map((s) => s.slotTime)
      .sort((a, b) => a - b);
    const minTime = sortedTimes[0];
    const maxTime = sortedTimes[sortedTimes.length - 1];

    return (
      slotTime === minTime - 0.5 ||
      slotTime === maxTime + 0.5 ||
      (slotTime >= minTime && slotTime <= maxTime)
    );
  };

  const toggleSlot = (courtId: string, slotTime: number) => {
    if (isSlotBooked(courtId, slotTime)) return;

    const existingIndex = selectedSlots.findIndex(
      (s) => s.courtId === courtId && s.slotTime === slotTime,
    );

    if (existingIndex >= 0) {
      const newSlots = [...selectedSlots];
      newSlots.splice(existingIndex, 1);
      setSelectedSlots(newSlots);
    } else {
      if (selectedSlots.length === 0) {
        setSelectedSlots([{ courtId, slotTime }]);
      } else {
        const firstCourt = selectedSlots[0].courtId;
        if (firstCourt !== courtId) {
          setSelectedSlots([{ courtId, slotTime }]);
        } else if (isSlotConsecutive(courtId, slotTime)) {
          const sortedTimes = [
            ...selectedSlots.map((s) => s.slotTime),
            slotTime,
          ].sort((a, b) => a - b);
          const newSlots = sortedTimes.map((t) => ({ courtId, slotTime: t }));
          setSelectedSlots(newSlots);
        }
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedSlots.length === 0) {
      alert("Please select at least one time slot");
      return;
    }

    // Minimum booking: 90 mins (3 slots) for Futsal, 1 hour (2 slots) for others
    const minSlots = formData.courtType === "FUTSAL" ? 3 : 2;
    if (selectedSlots.length < minSlots) {
      alert(
        formData.courtType === "FUTSAL"
          ? "Minimum booking time for Futsal is 90 minutes (3 consecutive slots)"
          : "Minimum booking time is 1 hour (2 consecutive slots)",
      );
      return;
    }

    if (!formData.userName || !formData.userEmail || !formData.userPhone) {
      alert("Please fill in all user details");
      return;
    }

    setIsSubmitting(true);

    try {
      const sortedTimes = selectedSlots
        .map((s) => s.slotTime)
        .sort((a, b) => a - b);
      const startTime = sortedTimes[0];
      const duration = selectedSlots.length * 0.5;
      const dateString =
        formData.date instanceof Date
          ? formatLocalDate(formData.date)
          : formData.date;

      const result = await updateBooking({
        bookingId,
        date: dateString,
        startTime,
        duration,
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
        alert(result.error || "Failed to update booking");
        setIsSubmitting(false);
      }
    } catch (error: any) {
      alert(error.message || "An error occurred");
    } finally {
      setIsSubmitting(false);
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
      <div className="max-w-6xl mx-auto space-y-6">
        <Button
          variant="ghost"
          onClick={() => router.push("/admin/bookings")}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Bookings
        </Button>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Date and Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date" className="text-zinc-200 text-sm">
                Date
              </Label>
              <DatePicker
                date={formData.date}
                onDateChange={(date) => {
                  if (date) {
                    setFormData({ ...formData, date });
                    setSelectedSlots([]);
                  }
                }}
                variant="admin"
                minDate={COMPLEX_OPENING_DATE}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status" className="text-zinc-200 text-sm">
                Status
              </Label>
              <Select
                value={formData.status}
                onValueChange={(v) =>
                  setFormData({ ...formData, status: v as any })
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

          {/* Slot Selection */}
          <div className="space-y-4">
            <Label className="text-zinc-200 text-sm">
              Select Time Slots
              {selectedSlots.length > 0 && (
                <span className="ml-2 text-[#2DD4BF]">
                  ({selectedSlots.length * 0.5} hour
                  {selectedSlots.length * 0.5 !== 1 ? "s" : ""})
                </span>
              )}
            </Label>

            {isLoadingCourts || isLoadingDateBookings ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-[#2DD4BF]" />
              </div>
            ) : courts.length === 0 ? (
              <p className="text-zinc-400 text-sm py-8 text-center">
                No courts available for this court type.
              </p>
            ) : (
              <>
                {/* Desktop: horizontal grid with time column + court columns */}
                <div className="hidden lg:block border border-zinc-800 rounded-lg overflow-hidden bg-zinc-900/50">
                  <div className="overflow-x-auto">
                    <div className="min-w-[600px] grid grid-cols-[130px_1fr]">
                      <div className="border-r border-zinc-800 bg-zinc-950">
                        <div className="h-12 flex items-center justify-center border-b border-zinc-800 text-zinc-400 text-xs font-mono uppercase">
                          Time
                        </div>
                        {timeSlots.map((slotTime) => {
                          const startHour = Math.floor(slotTime);
                          const startMin = slotTime % 1 === 0 ? "00" : "30";
                          const endTime = slotTime + 0.5;
                          const endHour = Math.floor(endTime);
                          const endMin = endTime % 1 === 0 ? "00" : "30";
                          return (
                            <div
                              key={slotTime}
                              className="h-6 flex items-center justify-center text-xs text-zinc-500 font-mono border-b border-zinc-800"
                            >
                              {startHour}:{startMin}-{endHour}:{endMin}
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex">
                        {courts.map((court) => (
                          <div
                            key={court._id}
                            className="flex-1 min-w-[150px] border-r border-zinc-800 last:border-0"
                          >
                            <div className="h-auto min-h-12 p-2 border-b border-zinc-800 flex flex-col justify-center bg-zinc-950">
                              <h3 className="font-medium text-white text-xs truncate">
                                {court.name}
                              </h3>
                              {court.timeBasedPricingEnabled &&
                              Array.isArray(court.pricingPeriods) &&
                              court.pricingPeriods.length > 0 ? (
                                <div className="mt-0.5 space-y-0.5">
                                  {court.pricingPeriods.map(
                                    (
                                      period: CourtPricingPeriod,
                                      idx: number,
                                    ) => (
                                      <p
                                        key={idx}
                                        className="text-[10px] text-zinc-400"
                                      >
                                        {period.label === "peak"
                                          ? "Peak"
                                          : "Off-peak"}
                                        : PKR{" "}
                                        {period.pricePerHour.toLocaleString()}
                                        /hr{" "}
                                        <span className="text-zinc-500">
                                          ({formatPeriodTime(period)})
                                        </span>
                                      </p>
                                    ),
                                  )}
                                </div>
                              ) : (
                                <p className="text-xs text-[#2DD4BF]">
                                  PKR {court.pricePerHour}/hr
                                </p>
                              )}
                            </div>
                            <div>
                              {timeSlots.map((slotTime) => {
                                const isBooked = isSlotBooked(
                                  court._id,
                                  slotTime,
                                );
                                const isSelected = isSlotSelected(
                                  court._id,
                                  slotTime,
                                );
                                const isConsecutive = isSlotConsecutive(
                                  court._id,
                                  slotTime,
                                );
                                const canSelect =
                                  selectedSlots.length === 0 || isConsecutive;
                                return (
                                  <div
                                    key={slotTime}
                                    className="h-6 p-0.5 border-b border-zinc-800"
                                  >
                                    <button
                                      type="button"
                                      onClick={() =>
                                        toggleSlot(court._id, slotTime)
                                      }
                                      disabled={
                                        isBooked || (!canSelect && !isSelected)
                                      }
                                      className={`
                                        w-full h-full rounded transition-all duration-200 relative flex items-center justify-center
                                        ${
                                          isBooked
                                            ? "bg-red-500/20 border border-red-500/50 cursor-not-allowed opacity-50"
                                            : isSelected
                                              ? "bg-[#2DD4BF] border border-[#2DD4BF]"
                                              : !canSelect
                                                ? "bg-zinc-800/50 border border-zinc-700 cursor-not-allowed opacity-50"
                                                : "bg-green-500/10 border border-green-500/30 hover:bg-green-500/20 hover:border-green-500/50 cursor-pointer"
                                        }
                                      `}
                                    >
                                      <span className="text-[9px] md:text-[10px] font-mono text-white/90 leading-tight text-center">
                                        {formatTime12(slotTime)} -{" "}
                                        {formatTime12(slotTime + 0.5)}
                                      </span>
                                      {isSelected && (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                          <CheckCircle className="w-3 h-3 text-[#0F172A]" />
                                        </div>
                                      )}
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mobile: one card per court with slot grid */}
                <div className="lg:hidden space-y-4">
                  {courts.map((court) => (
                    <div
                      key={court._id}
                      className="border border-zinc-800 rounded-lg overflow-hidden bg-zinc-900/50 p-4"
                    >
                      <div className="mb-3 pb-3 border-b border-zinc-800">
                        <h3 className="font-medium text-white text-sm">
                          {court.name}
                        </h3>
                        {court.timeBasedPricingEnabled &&
                        Array.isArray(court.pricingPeriods) &&
                        court.pricingPeriods.length > 0 ? (
                          <div className="mt-1 space-y-0.5">
                            {court.pricingPeriods.map(
                              (
                                period: CourtPricingPeriod,
                                idx: number,
                              ) => (
                                <p
                                  key={idx}
                                  className="text-[11px] text-zinc-400"
                                >
                                  {period.label === "peak"
                                    ? "Peak"
                                    : "Off-peak"}
                                  : PKR{" "}
                                  {period.pricePerHour.toLocaleString()}/hr{" "}
                                  <span className="text-zinc-500">
                                    ({formatPeriodTime(period)})
                                  </span>
                                </p>
                              ),
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-[#2DD4BF] mt-0.5">
                            PKR {court.pricePerHour}/hr
                          </p>
                        )}
                      </div>
                      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                        {timeSlots.map((slotTime) => {
                          const isBooked = isSlotBooked(court._id, slotTime);
                          const isSelected = isSlotSelected(
                            court._id,
                            slotTime,
                          );
                          const isConsecutive = isSlotConsecutive(
                            court._id,
                            slotTime,
                          );
                          const canSelect =
                            selectedSlots.length === 0 || isConsecutive;
                          return (
                            <button
                              key={slotTime}
                              type="button"
                              onClick={() => toggleSlot(court._id, slotTime)}
                              disabled={isBooked || (!canSelect && !isSelected)}
                              className={`
                                aspect-square rounded-lg transition-all duration-200 relative flex flex-col items-center justify-center p-1 text-[9px] font-mono text-white/90
                                ${
                                  isBooked
                                    ? "bg-red-500/20 border border-red-500/50 cursor-not-allowed opacity-50"
                                    : isSelected
                                      ? "bg-[#2DD4BF] border border-[#2DD4BF] text-[#0F172A]"
                                      : !canSelect
                                        ? "bg-zinc-800/50 border border-zinc-700 cursor-not-allowed opacity-50"
                                        : "bg-green-500/10 border border-green-500/30 hover:bg-green-500/20 cursor-pointer"
                                }
                              `}
                            >
                              <span className="leading-tight text-center">
                                {formatTime12(slotTime)} -{" "}
                                {formatTime12(slotTime + 0.5)}
                              </span>
                              {isSelected && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <CheckCircle className="w-4 h-4 text-[#0F172A]" />
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {selectedSlots.length > 0 && (
              <div className="text-xs text-zinc-400">
                Selected: {selectedSlots.length} slot
                {selectedSlots.length !== 1 ? "s" : ""}(
                {selectedSlots.length * 0.5} hour
                {selectedSlots.length * 0.5 !== 1 ? "s" : ""})
              </div>
            )}
          </div>

          {/* User Details */}
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

          {/* Payment Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">
              Payment Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="total-price" className="text-zinc-200 text-sm">
                  Total Price
                </Label>
                <Input
                  id="total-price"
                  type="text"
                  value={`PKR ${
                    (courts.find((c) => c.type === formData.courtType)
                      ?.pricePerHour || 0) * (selectedSlots.length * 0.5 || 1)
                  }`}
                  disabled
                  className="text-sm bg-zinc-800"
                />
              </div>
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
                      value={formData.amountReceivedOnline === 0 ? "" : formData.amountReceivedOnline}
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
                      value={formData.amountReceivedCash === 0 ? "" : formData.amountReceivedCash}
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
                  {(formData.amountReceivedOnline + formData.amountReceivedCash) >
                    0 && formData.status === "pending_payment"
                    ? 'Status will change to "Confirmed" when saved. Set status to "Completed" when payment is fully settled.'
                    : ""}
                </p>
              </div>
            </div>
          </div>

          {/* Submit Buttons */}
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
              disabled={
                isSubmitting ||
                selectedSlots.length < (formData.courtType === "FUTSAL" ? 3 : 2)
              }
            >
              {isSubmitting ? (
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
