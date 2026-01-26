"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-utils";
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
import api from "@/lib/api";
import { OPERATING_HOURS } from "@/types";
import type { Court, Booking } from "@/types";

export default function EditBookingPage() {
  useAuth(['admin', 'super_admin']);
  const router = useRouter();
  const params = useParams();
  const bookingId = params.id as string;
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingBooking, setIsLoadingBooking] = useState(true);
  
  // Slot selection state
  const [courts, setCourts] = useState<Court[]>([]);
  const [dateBookings, setDateBookings] = useState<any[]>([]);
  const [selectedSlots, setSelectedSlots] = useState<{ courtId: string; slotTime: number }[]>([]);
  const [isLoadingCourts, setIsLoadingCourts] = useState(false);
  const [isLoadingDateBookings, setIsLoadingDateBookings] = useState(false);
  
  const [formData, setFormData] = useState({
    date: new Date(),
    courtType: "PADEL" as "PADEL" | "CRICKET" | "PICKLEBALL" | "FUTSAL",
    userName: "",
    userEmail: "",
    userPhone: "",
    status: "pending_payment" as "pending_payment" | "confirmed" | "cancelled" | "completed",
    amountPaid: 0,
  });

  useEffect(() => {
    if (bookingId) {
      loadBooking();
    }
  }, [bookingId]);

  useEffect(() => {
    if (formData.courtType) {
      loadCourts();
    }
  }, [formData.courtType]);

  useEffect(() => {
    if (formData.date) {
      loadBookingsForDate();
    }
  }, [formData.date]);

  useEffect(() => {
    // Pre-select slots when booking and courts are loaded
    if (courts.length > 0 && !isLoadingBooking && !isLoadingCourts) {
      loadBookingForSlots();
    }
  }, [courts, isLoadingBooking, isLoadingCourts]);

  const loadBooking = async () => {
    setIsLoadingBooking(true);
    try {
      const response = await api.get(`/api/bookings/${bookingId}`);
      if (response.data?.success && response.data.booking) {
        const booking = response.data.booking;
        const courtType = typeof booking.courtId === "object" &&
          booking.courtId &&
          "type" in booking.courtId
            ? (booking.courtId as Court).type
            : "PADEL";
        
        setFormData({
          date: new Date(booking.date),
          courtType: courtType as "PADEL" | "CRICKET" | "PICKLEBALL" | "FUTSAL",
          userName: booking.userName,
          userEmail: booking.userEmail,
          userPhone: booking.userPhone || "",
          status: booking.status as "pending_payment" | "confirmed" | "cancelled" | "completed",
          amountPaid: booking.amountPaid || 0,
        });
      } else {
        alert("Booking not found");
        router.push("/admin/bookings");
      }
    } catch (error: any) {
      console.error('Failed to load booking:', error);
      alert(error.response?.data?.error || "Failed to load booking");
      router.push("/admin/bookings");
    } finally {
      setIsLoadingBooking(false);
    }
  };

  const loadBookingForSlots = async () => {
    try {
      const response = await api.get(`/api/bookings/${bookingId}`);
      if (response.data?.success && response.data.booking) {
        const booking = response.data.booking;
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
      console.error('Failed to load booking for slots:', error);
    }
  };

  const loadCourts = async () => {
    setIsLoadingCourts(true);
    try {
      const response = await api.get(`/api/courts?type=${formData.courtType}`);
      if (response.data) {
        setCourts(response.data);
      } else {
        setCourts([]);
      }
    } catch (error) {
      console.error('Failed to load courts:', error);
      setCourts([]);
    } finally {
      setIsLoadingCourts(false);
    }
  };

  const loadBookingsForDate = async () => {
    setIsLoadingDateBookings(true);
    try {
      const dateString = formData.date instanceof Date
        ? formData.date.toISOString().split("T")[0]
        : formData.date;
      const response = await api.get(`/api/bookings?date=${dateString}`);
      if (response.data?.success) {
        const filtered = response.data.bookings.filter(
          (b: any) =>
            b.courtId?.type === formData.courtType && 
            b.status !== "cancelled" &&
            b._id !== bookingId
        );
        setDateBookings(filtered);
      } else {
        setDateBookings([]);
      }
    } catch (error) {
      console.error('Failed to load bookings for date:', error);
      setDateBookings([]);
    } finally {
      setIsLoadingDateBookings(false);
    }
  };

  // Generate time slots
  const timeSlots: number[] = [];
  for (let hour = OPERATING_HOURS.start; hour < OPERATING_HOURS.end; hour++) {
    timeSlots.push(hour);
    timeSlots.push(hour + 0.5);
  }

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
      (s) => s.courtId === courtId && s.slotTime === slotTime
    );
  };

  const isSlotConsecutive = (courtId: string, slotTime: number) => {
    if (selectedSlots.length === 0) return true;
    if (selectedSlots[0].courtId !== courtId) return false;

    const sortedTimes = selectedSlots.map((s) => s.slotTime).sort((a, b) => a - b);
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
      (s) => s.courtId === courtId && s.slotTime === slotTime
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

    if (selectedSlots.length < 2) {
      alert("Minimum booking time is 1 hour (2 consecutive slots)");
      return;
    }

    if (!formData.userName || !formData.userEmail || !formData.userPhone) {
      alert("Please fill in all user details");
      return;
    }

    setIsSubmitting(true);

    try {
      const sortedTimes = selectedSlots.map((s) => s.slotTime).sort((a, b) => a - b);
      const startTime = sortedTimes[0];
      const duration = selectedSlots.length * 0.5;
      const dateString = formData.date instanceof Date
        ? formData.date.toISOString().split("T")[0]
        : formData.date;

      const response = await api.put('/api/admin/bookings', {
        bookingId,
        date: dateString,
        startTime,
        duration,
        userName: formData.userName,
        userEmail: formData.userEmail,
        userPhone: formData.userPhone,
        status: formData.status,
        amountPaid: formData.amountPaid,
      });

      if (response.data?.success) {
        router.replace("/admin/bookings");
      } else {
        alert(response.data?.error || "Failed to update booking");
        setIsSubmitting(false);
      }
    } catch (error: any) {
      alert(error.response?.data?.error || error.message || "An error occurred");
      setIsSubmitting(false);
    }
  };

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
    <AdminLayout
      title="Edit Booking"
      description="Update booking details"
    >
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
                  <SelectItem value="pending_payment">Pending Payment</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Amount Paid */}
          <div className="space-y-2">
            <Label htmlFor="amount-paid" className="text-zinc-200 text-sm">
              Amount Paid (PKR)
            </Label>
            <Input
              id="amount-paid"
              type="number"
              min="0"
              step="0.01"
              value={formData.amountPaid}
              onChange={(e) => {
                const value = parseFloat(e.target.value) || 0;
                setFormData({ 
                  ...formData, 
                  amountPaid: value,
                  // Auto-update status to confirmed if amount paid > 0
                  status: value > 0 ? "confirmed" : formData.status === "confirmed" ? "pending_payment" : formData.status
                });
              }}
              className="text-sm"
              placeholder="0.00"
            />
            <p className="text-xs text-zinc-400">
              Entering an amount will automatically change status to "Confirmed"
            </p>
          </div>

          {/* Slot Selection */}
          <div className="space-y-4">
            <Label className="text-zinc-200 text-sm">
              Select Time Slots
              {selectedSlots.length > 0 && (
                <span className="ml-2 text-[#2DD4BF]">
                  ({selectedSlots.length * 0.5} hour{selectedSlots.length * 0.5 !== 1 ? "s" : ""})
                </span>
              )}
            </Label>
            
            {isLoadingCourts || isLoadingDateBookings ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-[#2DD4BF]" />
              </div>
            ) : courts.length === 0 ? (
              <p className="text-zinc-400 text-sm py-8 text-center">No courts available for this court type.</p>
            ) : (
              <div className="border border-zinc-800 rounded-lg overflow-hidden bg-zinc-900/50">
                <div className="overflow-x-auto">
                  <div className="min-w-[600px] grid grid-cols-[100px_1fr]">
                    {/* Time Slots Column */}
                    <div className="border-r border-zinc-800 bg-zinc-950">
                      <div className="h-12 flex items-center justify-center border-b border-zinc-800 text-zinc-400 text-xs font-mono uppercase">
                        Time
                      </div>
                      {timeSlots.map((slotTime) => {
                        const startHour = Math.floor(slotTime);
                        const startMin = slotTime % 1 === 0 ? "00" : "30";
                        return (
                          <div
                            key={slotTime}
                            className="h-6 flex items-center justify-center text-xs text-zinc-500 font-mono border-b border-zinc-800"
                          >
                            {startHour}:{startMin}
                          </div>
                        );
                      })}
                    </div>

                    {/* Courts Columns */}
                    <div className="flex">
                      {courts.map((court) => (
                        <div
                          key={court._id}
                          className="flex-1 min-w-[150px] border-r border-zinc-800 last:border-0"
                        >
                          <div className="h-12 p-2 border-b border-zinc-800 flex flex-col justify-center bg-zinc-950">
                            <h3 className="font-medium text-white text-xs truncate">
                              {court.name}
                            </h3>
                            <p className="text-xs text-[#2DD4BF]">
                              PKR {court.pricePerHour}/hr
                            </p>
                          </div>

                          <div>
                            {timeSlots.map((slotTime) => {
                              const isBooked = isSlotBooked(court._id, slotTime);
                              const isSelected = isSlotSelected(court._id, slotTime);
                              const isConsecutive = isSlotConsecutive(court._id, slotTime);
                              const canSelect = selectedSlots.length === 0 || isConsecutive;

                              return (
                                <div
                                  key={slotTime}
                                  className="h-6 p-0.5 border-b border-zinc-800"
                                >
                                  <button
                                    type="button"
                                    onClick={() => toggleSlot(court._id, slotTime)}
                                    disabled={isBooked || (!canSelect && !isSelected)}
                                    className={`
                                      w-full h-full rounded transition-all duration-200
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
                                    {isSelected && (
                                      <div className="flex items-center justify-center">
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
            )}
            
            {selectedSlots.length > 0 && (
              <div className="text-xs text-zinc-400">
                Selected: {selectedSlots.length} slot{selectedSlots.length !== 1 ? "s" : ""} 
                ({selectedSlots.length * 0.5} hour{selectedSlots.length * 0.5 !== 1 ? "s" : ""})
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
              disabled={isSubmitting || selectedSlots.length < 2}
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
