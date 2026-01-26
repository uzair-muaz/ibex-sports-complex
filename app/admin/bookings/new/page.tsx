"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-utils";
import { useRouter } from "next/navigation";
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
import type { Court } from "@/types";

export default function NewBookingPage() {
  useAuth(['admin', 'super_admin']);
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
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
  });

  useEffect(() => {
    loadCourts();
  }, []);

  useEffect(() => {
    if (formData.date && formData.courtType) {
      loadBookingsForDate();
    }
  }, [formData.date, formData.courtType]);

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
            b.status !== "cancelled"
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

      const response = await api.post('/api/bookings', {
        courtType: formData.courtType,
        date: dateString,
        startTime,
        duration,
        userName: formData.userName,
        userEmail: formData.userEmail,
        userPhone: formData.userPhone,
      });

      if (response.data?.success) {
        router.replace("/admin/bookings");
      } else {
        alert(response.data?.error || "Failed to create booking");
        setIsSubmitting(false);
      }
    } catch (error: any) {
      alert(error.response?.data?.error || error.message || "An error occurred");
      setIsSubmitting(false);
    }
  };

  return (
    <AdminLayout
      title="Create Booking"
      description="Add a new booking"
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
          {/* Court Type and Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="court-type" className="text-zinc-200 text-sm">
                Court Type
              </Label>
              <Select
                value={formData.courtType}
                onValueChange={(v) => {
                  setFormData({
                    ...formData,
                    courtType: v as any,
                  });
                  setSelectedSlots([]);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PADEL">Padel</SelectItem>
                  <SelectItem value="CRICKET">Cricket</SelectItem>
                  <SelectItem value="PICKLEBALL">Pickleball</SelectItem>
                  <SelectItem value="FUTSAL">Futsal</SelectItem>
                </SelectContent>
              </Select>
            </div>

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
                  Creating...
                </>
              ) : (
                "Create Booking"
              )}
            </Button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
