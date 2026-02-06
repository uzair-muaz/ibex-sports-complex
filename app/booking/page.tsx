"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { QRCode } from "@/components/ui/qr-code";
import { Skeleton } from "@/components/ui/skeleton";
import {
  OPERATING_HOURS,
  CourtType,
  COMPLEX_OPENING_DATE,
  AppliedDiscount,
  Discount,
  CourtPricingPeriod,
} from "@/types";
import { getCourts } from "../actions/courts";
import { getBookingsByDate, createBooking } from "../actions/bookings";
import { getActiveDiscounts } from "../actions/discounts";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { formatLocalDate } from "@/lib/utils";
import {
  getApplicableDiscounts,
  calculateDiscountedPrice,
  DiscountInput,
} from "@/lib/discount-utils";
import { calculateOriginalPrice } from "@/lib/pricing-utils";
import { PriceBreakdown } from "@/components/PriceBreakdown";
import { DiscountBanner } from "@/components/DiscountBanner";

export default function BookingPage() {
  // Default to opening date if today is before it
  const getInitialDate = () => {
    const today = new Date();
    return today < COMPLEX_OPENING_DATE ? COMPLEX_OPENING_DATE : today;
  };
  const [selectedDate, setSelectedDate] = useState<Date>(getInitialDate());
  const [selectedCourtType, setSelectedCourtType] = useState<CourtType | null>(
    null,
  );
  const [availableCourtTypes, setAvailableCourtTypes] = useState<CourtType[]>(
    [],
  );
  const [courts, setCourts] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [selectedSlots, setSelectedSlots] = useState<
    { courtId: string; slotTime: number }[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCourts, setIsLoadingCourts] = useState(false);
  const [isLoadingTypes, setIsLoadingTypes] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectionError, setSelectionError] = useState<string>("");
  const [createdBooking, setCreatedBooking] = useState<any>(null);
  const [activeDiscounts, setActiveDiscounts] = useState<Discount[]>([]);

  // Form State
  const [formData, setFormData] = useState({ name: "", email: "", phone: "" });
  const [formStatus, setFormStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSticky, setIsSticky] = useState(false);
  const stickyRef = useRef<HTMLDivElement>(null);

  // Detect when sticky element becomes stuck
  useEffect(() => {
    const handleScroll = () => {
      if (stickyRef.current) {
        const rect = stickyRef.current.getBoundingClientRect();
        // Check if the element is at its sticky position (top-20 = 80px or top-24 = 96px)
        const stickyTop = window.innerWidth >= 768 ? 96 : 80;
        setIsSticky(rect.top <= stickyTop + 2);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // Check initial state

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const formatTime12 = (time: number) => {
    const totalMinutes = Math.round(time * 60);
    let h = Math.floor(totalMinutes / 60) % 24;
    const m = totalMinutes % 60;
    const suffix = h >= 12 ? "PM" : "AM";
    const displayHour = h % 12 === 0 ? 12 : h % 12;
    const minuteStr = m.toString().padStart(2, "0");
    return `${displayHour}:${minuteStr} ${suffix}`;
  };

  // Load available court types and active discounts on mount
  useEffect(() => {
    const loadAvailableTypes = async () => {
      setIsLoadingTypes(true);
      try {
        const result = await getCourts(); // Get all active courts
        if (result.success && result.courts.length > 0) {
          // Extract unique court types
          const types = [
            ...new Set(result.courts.map((c: any) => c.type)),
          ] as CourtType[];
          setAvailableCourtTypes(types);
          // Set default to first available type
          if (types.length > 0 && !selectedCourtType) {
            setSelectedCourtType(types[0]);
          }
        }
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoadingTypes(false);
      }
    };

    const loadDiscounts = async () => {
      try {
        const result = await getActiveDiscounts();
        if (result.success) {
          setActiveDiscounts(result.discounts);
        }
      } catch (error) {
        console.error("Failed to load discounts:", error);
      }
    };

    loadAvailableTypes();
    loadDiscounts();
  }, []);

  useEffect(() => {
    if (selectedCourtType) {
      window.scrollTo(0, 0);
      loadCourts();
    }
  }, [selectedCourtType]);

  useEffect(() => {
    if (selectedCourtType) {
      loadBookings();
    }
  }, [selectedDate, selectedCourtType]);

  const loadCourts = async () => {
    if (!selectedCourtType) return;
    setIsLoadingCourts(true);
    try {
      const result = await getCourts(selectedCourtType);
      if (result.success) {
        setCourts(result.courts);
        setSelectedSlots([]); // Reset selection when court type changes
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoadingCourts(false);
    }
  };

  const loadBookings = async () => {
    setIsLoading(true);
    try {
      const dateString = formatLocalDate(selectedDate);
      const result = await getBookingsByDate(dateString);
      if (result.success) {
        // Filter bookings for selected court type
        const filtered = result.bookings.filter(
          (b: any) =>
            b.courtId?.type === selectedCourtType && b.status !== "cancelled",
        );
        setBookings(filtered);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const isSlotBooked = (courtId: string, slotTime: number) => {
    return bookings.some((b) => {
      const bookingCourtId =
        typeof b.courtId === "object" ? b.courtId._id : b.courtId;
      if (bookingCourtId !== courtId) return false;

      const bookingStart = b.startTime;
      const bookingEnd = b.startTime + b.duration;

      // Check if 30-minute slot falls within booking range
      return slotTime >= bookingStart && slotTime < bookingEnd;
    });
  };

  // Check if a time slot has already passed, handling 12 PM – 2 AM business day
  const isSlotPassed = (slotTime: number) => {
    const now = new Date();

    // Base date at midnight for the selected calendar day
    const selectedDay = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      selectedDate.getDate(),
    );

    // Build an exact Date for this slot. For hours between 12 PM–11:30 PM
    // we use the selected day. For 12 AM–2 AM we treat them as happening
    // in the early morning following the selected day.
    const slotDateTime = new Date(selectedDay);
    const slotHour = Math.floor(slotTime);
    const slotMinutes = slotTime % 1 === 0 ? 0 : 30;

    if (slotTime < 2) {
      // 12:00–1:30 AM are considered the next calendar day
      slotDateTime.setDate(slotDateTime.getDate() + 1);
    }

    slotDateTime.setHours(slotHour, slotMinutes, 0, 0);

    return slotDateTime.getTime() <= now.getTime();
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

    // Check if slotTime is exactly 0.5 hours before min or after max
    return (
      Math.abs(slotTime - (minTime - 0.5)) < 0.01 ||
      Math.abs(slotTime - (maxTime + 0.5)) < 0.01
    );
  };

  const toggleSlot = (courtId: string, slotTime: number) => {
    if (isSlotPassed(slotTime)) {
      setSelectionError("This time slot has already passed.");
      setTimeout(() => setSelectionError(""), 3000);
      return;
    }

    if (isSlotBooked(courtId, slotTime)) {
      setSelectionError("This slot is already booked.");
      setTimeout(() => setSelectionError(""), 3000);
      return;
    }

    const existingIndex = selectedSlots.findIndex(
      (s) => s.courtId === courtId && s.slotTime === slotTime,
    );

    // Minimum slots required: 3 for Futsal (90 mins), 2 for others (60 mins)
    const minSlots = selectedCourtType === "FUTSAL" ? 3 : 2;
    const minTimeMsg =
      selectedCourtType === "FUTSAL"
        ? "Minimum booking for Futsal is 90 minutes (3 consecutive slots)."
        : "Minimum booking is 1 hour (2 consecutive slots).";

    if (existingIndex >= 0) {
      // Deselecting a slot
      const newSlots = [...selectedSlots];
      newSlots.splice(existingIndex, 1);

      // If removing a slot leaves less than minimum slots, clear all
      if (newSlots.length < minSlots) {
        setSelectedSlots([]);
        setSelectionError(minTimeMsg);
        setTimeout(() => setSelectionError(""), 3000);
      } else {
        setSelectedSlots(newSlots);
        setSelectionError("");
      }
    } else {
      // Selecting a new slot
      setSelectionError("");

      // Minimum slots message based on court type
      const selectMoreMsg =
        selectedCourtType === "FUTSAL"
          ? "Select more consecutive slots to complete 90 minutes minimum booking."
          : "Select another consecutive slot to complete 1 hour minimum booking.";

      // If no slots selected yet, start with this one
      if (selectedSlots.length === 0) {
        setSelectedSlots([{ courtId, slotTime }]);
        setSelectionError(selectMoreMsg);
        setTimeout(() => setSelectionError(""), 3000);
        return;
      }

      // Check if same court
      const firstCourt = selectedSlots[0].courtId;
      if (firstCourt !== courtId) {
        // Different court - replace selection
        setSelectedSlots([{ courtId, slotTime }]);
        setSelectionError(selectMoreMsg);
        setTimeout(() => setSelectionError(""), 3000);
        return;
      }

      // Same court - check if consecutive (0.5 hour increments, no breaks)
      const sortedTimes = [
        ...selectedSlots.map((s) => s.slotTime),
        slotTime,
      ].sort((a, b) => a - b);

      let isConsecutive = true;
      for (let i = 0; i < sortedTimes.length - 1; i++) {
        // Check if next slot is exactly 0.5 hours after current slot
        if (Math.abs(sortedTimes[i + 1] - sortedTimes[i] - 0.5) > 0.01) {
          isConsecutive = false;
          break;
        }
      }

      if (!isConsecutive) {
        // Not consecutive - clear and start new selection from this slot
        setSelectedSlots([{ courtId, slotTime }]);
        setSelectionError("Slots must be consecutive. Starting new selection.");
        setTimeout(() => setSelectionError(""), 3000);
        return;
      }

      // Consecutive slot - add it
      setSelectedSlots((prev) =>
        [...prev, { courtId, slotTime }].sort(
          (a, b) => a.slotTime - b.slotTime,
        ),
      );
      setSelectionError("");
    }
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSlots.length === 0) return;

    const sortedTimes = selectedSlots
      .map((s) => s.slotTime)
      .sort((a, b) => a - b);

    // Check if slots are consecutive (0.5 hour increments, no breaks)
    let isConsecutive = true;
    for (let i = 0; i < sortedTimes.length - 1; i++) {
      if (Math.abs(sortedTimes[i + 1] - sortedTimes[i] - 0.5) > 0.01) {
        isConsecutive = false;
        break;
      }
    }

    if (!isConsecutive) {
      setErrorMessage("Please select consecutive time slots with no breaks.");
      return;
    }

    // Minimum booking: 90 mins (3 slots) for Futsal, 1 hour (2 slots) for others
    const minSlots = selectedCourtType === "FUTSAL" ? 3 : 2;
    if (selectedSlots.length < minSlots) {
      setErrorMessage(
        selectedCourtType === "FUTSAL"
          ? "Minimum booking time for Futsal is 90 minutes (3 consecutive slots)."
          : "Minimum booking time is 1 hour (2 consecutive slots).",
      );
      return;
    }

    setFormStatus("loading");
    setErrorMessage("");

    try {
      if (!selectedCourtType) {
        setErrorMessage("Please select a court type");
        setFormStatus("error");
        return;
      }

      const startTime = sortedTimes[0];
      // Duration in hours: number of slots * 0.5 hours per slot
      const duration = selectedSlots.length * 0.5;

      const result = await createBooking({
        courtType: selectedCourtType,
        date: formatLocalDate(selectedDate),
        startTime,
        duration,
        userName: formData.name,
        userEmail: formData.email,
        userPhone: formData.phone,
      });

      if (result.success) {
        setFormStatus("success");
        setCreatedBooking(result.booking);
      } else {
        setFormStatus("error");
        setErrorMessage(result.error || "Failed to create booking");
      }
    } catch (err: any) {
      console.error(err);
      setFormStatus("error");
      setErrorMessage(err.message || "An error occurred");
    }
  };

  // Generate 30-minute slots for business hours: 12:00 PM - 2:00 AM
  const timeSlots: number[] = [];
  // 12:00 PM (12) to 11:30 PM (23.5)
  for (let hour = 12; hour < 24; hour++) {
    timeSlots.push(hour);
    timeSlots.push(hour + 0.5);
  }
  // 12:00 AM (0) to 1:30 AM (1.5)
  for (let hour = 0; hour < 2; hour++) {
    timeSlots.push(hour);
    timeSlots.push(hour + 0.5);
  }

  const selectedDuration = selectedSlots.length * 0.5; // Duration in hours
  const selectedCourt = courts.find((c) => c._id === selectedSlots[0]?.courtId);

  const pricingResult = React.useMemo(() => {
    if (!selectedCourtType || selectedSlots.length === 0 || !selectedCourt) {
      return {
        originalPrice: 0,
        finalPrice: 0,
        discountAmount: 0,
        appliedDiscounts: [] as AppliedDiscount[],
      };
    }

    const sortedTimes = selectedSlots
      .map((s) => s.slotTime)
      .sort((a, b) => a - b);
    const startTime = sortedTimes[0];
    const duration = selectedSlots.length * 0.5;
    const dateString = formatLocalDate(selectedDate);

    const { originalPrice } = calculateOriginalPrice(
      selectedCourt,
      startTime,
      duration,
    );

    const discountsData: DiscountInput[] = activeDiscounts.map((d) => ({
      _id: d._id,
      name: d.name,
      type: d.type,
      value: d.value,
      courtTypes: d.courtTypes,
      allDay: d.allDay,
      startHour: d.startHour,
      endHour: d.endHour,
      validFrom: d.validFrom,
      validUntil: d.validUntil,
      isActive: d.isActive,
    }));

    const applicable = getApplicableDiscounts(
      discountsData,
      selectedCourtType,
      startTime,
      dateString,
    );
    const { finalPrice, discountAmount, appliedDiscounts } =
      calculateDiscountedPrice(originalPrice, applicable);

    return {
      originalPrice,
      finalPrice,
      discountAmount,
      appliedDiscounts,
    };
  }, [
    selectedCourtType,
    selectedSlots,
    selectedCourt,
    activeDiscounts,
    selectedDate,
  ]);

  const {
    originalPrice,
    finalPrice: totalPrice,
    discountAmount,
    appliedDiscounts,
  } = pricingResult;

  const formatPeriodTime = (period: CourtPricingPeriod) => {
    if (period.allDay) {
      return "All day";
    }

    return `${formatTime12(period.startHour)} - ${formatTime12(
      period.endHour,
    )}`;
  };

  return (
    <div className="min-h-screen bg-black text-white relative">
      <Navbar />
      <DiscountBanner className="fixed top-16 md:top-20 left-0 right-0 z-40" />

      <div className="fixed top-0 left-0 w-full h-[50vh] bg-gradient-to-b from-[#2DD4BF]/10 to-transparent pointer-events-none" />

      <div className="pt-20 md:pt-24 lg:pt-32 pb-20 md:pb-24 px-4 md:px-6">
        <div className="max-w-7xl mx-auto space-y-4 md:space-y-6 relative z-10">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 md:gap-8 pb-6 md:pb-8 border-b border-white/5">
            <div className="space-y-3 md:space-y-4">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white">
                Reserve
                <br />
                Your Spot.
              </h1>
              <p className="text-zinc-400 text-base md:text-lg max-w-md">
                Real-time availability for our premium courts.
              </p>
            </div>

            <div className="flex flex-col gap-4 w-full md:w-auto">
              {isLoadingTypes ? (
                <div className="bg-zinc-900/50 p-1 rounded-2xl border border-white/10 flex">
                  <Skeleton className="h-10 w-32 rounded-xl" />
                  <Skeleton className="h-10 w-32 rounded-xl ml-1" />
                </div>
              ) : availableCourtTypes.length > 0 ? (
                <div className="bg-zinc-900/50 p-1 rounded-2xl border border-white/10 flex flex-wrap md:flex-nowrap">
                  {availableCourtTypes.map((type) => (
                    <button
                      key={type}
                      onClick={() => {
                        setSelectedCourtType(type);
                        setSelectedSlots([]);
                      }}
                      className={`flex-1 md:flex-none px-4 md:px-8 py-2.5 md:py-3 rounded-xl text-xs md:text-sm font-semibold transition-all duration-300 ${
                        selectedCourtType === type
                          ? "bg-[#2DD4BF] text-[#0F172A] shadow-[0_0_20px_rgba(45,212,191,0.3)] scale-[1.02]"
                          : "text-zinc-500 hover:text-zinc-300"
                      }`}
                    >
                      {type === "PADEL"
                        ? "Padel"
                        : type === "CRICKET"
                          ? "Cricket"
                          : type === "PICKLEBALL"
                            ? "Pickleball"
                            : "Futsal"}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-zinc-500 text-sm">No courts available</div>
              )}
            </div>
          </div>

          {/* Date Picker */}
          <DatePicker
            date={selectedDate}
            onDateChange={(date) => {
              if (date) {
                setSelectedDate(date);
              }
            }}
            minDate={COMPLEX_OPENING_DATE}
          />

          {/* Legend & Info + Booking Grid Container */}
          <div>
            {/* Legend & Info - Sticky */}
            <div
              ref={stickyRef}
              // sticky - removing sticky for now
              className={` top-20 md:top-24 z-30 py-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all duration-200 ${
                isSticky
                  ? ""
                  : // "bg-black/70 backdrop-blur-md -mx-4 px-4 md:-mx-6 md:px-6 rounded-xl shadow-lg border border-white/10"
                    ""
              }`}
            >
              <div className="flex flex-wrap items-center gap-3 md:gap-6 text-xs md:text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500/80 border border-green-400" />
                  <span className="text-zinc-500">Available</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#2DD4BF]" />
                  <span className="text-zinc-500">Selected</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/80 border border-red-400" />
                  <span className="text-zinc-500">Booked</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-zinc-600/80 border border-zinc-500" />
                  <span className="text-zinc-500">Passed</span>
                </div>
              </div>

              {/* Minimum Booking Info */}
              <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-lg px-3 py-1.5 text-xs md:text-sm text-yellow-400">
                {selectedCourtType === "FUTSAL"
                  ? "Minimum booking for Futsal is 90 minutes (3 consecutive slots)."
                  : "Minimum booking is 1 hour (2 consecutive slots)."}
              </div>
            </div>

            {selectionError && (
              <div className="bg-orange-500/10 border border-orange-500/50 rounded-lg px-3 py-1.5 text-xs md:text-sm text-orange-400 max-w-md mt-2">
                {selectionError}
              </div>
            )}

            {/* Main Booking Grid */}
            <div className="mt-4">
              {isLoadingTypes || isLoadingCourts ? (
                <div className="space-y-4 ">
                  {/* Desktop Skeleton */}
                  <div className="hidden lg:block glass-panel rounded-3xl overflow-hidden p-1">
                    <div className="grid grid-cols-[130px_1fr]">
                      <div className="border-r border-white/5 bg-black/20 p-4">
                        <Skeleton className="h-24 w-full mb-2" />
                        {[...Array(34)].map((_, i) => (
                          <Skeleton key={i} className="h-7 w-full mb-0.5" />
                        ))}
                      </div>
                      <div className="flex">
                        {[...Array(3)].map((_, i) => (
                          <div
                            key={i}
                            className="flex-1 min-w-[200px] border-r border-white/5 last:border-0 p-4"
                          >
                            <Skeleton className="h-24 w-full mb-2" />
                            {[...Array(34)].map((_, j) => (
                              <Skeleton key={j} className="h-7 w-full mb-0.5" />
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  {/* Mobile Skeleton */}
                  <div className="lg:hidden space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div
                        key={i}
                        className="glass-panel rounded-2xl overflow-hidden p-4"
                      >
                        <Skeleton className="h-20 w-full mb-4" />
                        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                          {[...Array(24)].map((_, j) => (
                            <Skeleton
                              key={j}
                              className="aspect-square rounded-lg"
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : isLoading ? (
                <div className="flex items-center justify-center py-24">
                  <Loader2 className="h-12 w-12 animate-spin text-[#2DD4BF]" />
                </div>
              ) : (
                <>
                  {/* Desktop Grid View */}
                  <div className="hidden lg:block glass-panel rounded-3xl overflow-hidden p-1">
                    <div className="overflow-x-auto overflow-y-hidden">
                      <div className="grid grid-cols-[130px_1fr]">
                        {/* Time Slots Column */}
                        <div className="border-r border-white/5 bg-black/20">
                          <div className="h-24 flex items-center justify-center border-b border-white/5 text-zinc-500 text-xs font-mono uppercase tracking-widest">
                            Time
                          </div>
                          {timeSlots.map((slotTime) => {
                            const endTime = slotTime + 0.5;
                            return (
                              <div
                                key={slotTime}
                                className="h-7 flex items-center justify-center text-[11px] text-zinc-600 font-mono border-b border-dashed border-white/5"
                              >
                                {formatTime12(slotTime)} -{" "}
                                {formatTime12(endTime)}
                              </div>
                            );
                          })}
                        </div>

                        {/* Courts Columns */}
                        <div className="flex">
                          {courts.map((court) => (
                            <div
                              key={court._id}
                              className="flex-1 min-w-[200px] border-r border-white/5 last:border-0"
                            >
                              <div className="h-24 p-4 border-b border-white/5 flex flex-col justify-center bg-black/20 group">
                                <h3 className="font-semibold text-white group-hover:text-[#2DD4BF] transition-colors">
                                  {court.name}
                                </h3>
                                <p className="text-xs text-zinc-500 truncate mt-1">
                                  {court.description}
                                </p>
                                <p className="text-xs text-[#2DD4BF] mt-1">
                                  PKR {court.pricePerHour}/hr{" "}
                                  {court.pricePerHour === 0 && "(Free)"}
                                </p>
                                {court.timeBasedPricingEnabled &&
                                  Array.isArray(court.pricingPeriods) &&
                                  court.pricingPeriods.length > 0 && (
                                    <div className="mt-1 space-y-0.5">
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
                                  )}
                              </div>

                              <div className="">
                                {timeSlots.map((slotTime) => {
                                  const isBooked = isSlotBooked(
                                    court._id,
                                    slotTime,
                                  );
                                  const isPassed = isSlotPassed(slotTime);
                                  const isUnavailable = isBooked || isPassed;
                                  const isSelected = isSlotSelected(
                                    court._id,
                                    slotTime,
                                  );

                                  return (
                                    <div
                                      key={slotTime}
                                      className="h-7 p-0.5 border-b border-white/5"
                                    >
                                      <motion.button
                                        whileHover={
                                          !isUnavailable &&
                                          (selectedSlots.length === 0 ||
                                            isSlotConsecutive(
                                              court._id,
                                              slotTime,
                                            ))
                                            ? { scale: 0.98 }
                                            : {}
                                        }
                                        whileTap={
                                          !isUnavailable &&
                                          (selectedSlots.length === 0 ||
                                            isSlotConsecutive(
                                              court._id,
                                              slotTime,
                                            ))
                                            ? { scale: 0.95 }
                                            : {}
                                        }
                                        onClick={() =>
                                          toggleSlot(court._id, slotTime)
                                        }
                                        disabled={isUnavailable}
                                        title={
                                          isPassed
                                            ? "This time has passed"
                                            : selectedSlots.length > 0 &&
                                                selectedSlots[0].courtId ===
                                                  court._id &&
                                                !isSlotConsecutive(
                                                  court._id,
                                                  slotTime,
                                                ) &&
                                                !isSelected
                                              ? "Select consecutive slots only"
                                              : ""
                                        }
                                        className={`
                                    w-full h-full rounded transition-all duration-300 relative overflow-hidden
                                    ${
                                      isBooked
                                        ? "bg-red-500/80 border border-red-400 cursor-not-allowed opacity-75"
                                        : isPassed
                                          ? "bg-zinc-700/50 border border-zinc-600 cursor-not-allowed opacity-50"
                                          : isSelected
                                            ? "bg-[#2DD4BF] shadow-[0_0_15px_rgba(45,212,191,0.5)]"
                                            : selectedSlots.length > 0 &&
                                                selectedSlots[0].courtId ===
                                                  court._id &&
                                                !isSlotConsecutive(
                                                  court._id,
                                                  slotTime,
                                                )
                                              ? "bg-zinc-700/50 border border-zinc-600 cursor-not-allowed opacity-50"
                                              : "bg-green-500/20 border border-green-400/60 hover:bg-green-500/30 hover:border-green-400"
                                    }
                                  `}
                                      >
                                        {isSelected && (
                                          <motion.div
                                            layoutId={`check-${court._id}-${slotTime}`}
                                            className="absolute inset-0 flex items-center justify-center text-[#0F172A]"
                                          >
                                            <CheckCircle className="w-3 h-3" />
                                          </motion.div>
                                        )}
                                      </motion.button>
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

                  {/* Mobile Card View */}
                  <div className="lg:hidden space-y-4">
                    {courts.map((court) => (
                      <div
                        key={court._id}
                        className="glass-panel rounded-2xl overflow-hidden p-4"
                      >
                        <div className="mb-4 pb-4 border-b border-white/10">
                          <h3 className="text-lg font-semibold text-white mb-1">
                            {court.name}
                          </h3>
                          <p className="text-xs text-zinc-400 mb-2">
                            {court.description}
                          </p>
                          <p className="text-sm text-[#2DD4BF] font-medium">
                            PKR {court.pricePerHour}/hr{" "}
                            {court.pricePerHour === 0 && "(Free)"}
                          </p>
                          {court.timeBasedPricingEnabled &&
                            Array.isArray(court.pricingPeriods) &&
                            court.pricingPeriods.length > 0 && (
                              <div className="mt-1 space-y-0.5">
                                {court.pricingPeriods.map(
                                  (period: CourtPricingPeriod, idx: number) => (
                                    <p
                                      key={idx}
                                      className="text-[11px] text-zinc-400"
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
                            )}
                        </div>

                        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                          {timeSlots.map((slotTime) => {
                            const isBooked = isSlotBooked(court._id, slotTime);
                            const isPassed = isSlotPassed(slotTime);
                            const isUnavailable = isBooked || isPassed;
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
                              <motion.button
                                key={slotTime}
                                whileHover={
                                  !isUnavailable && canSelect
                                    ? { scale: 0.95 }
                                    : {}
                                }
                                whileTap={
                                  !isUnavailable && canSelect
                                    ? { scale: 0.9 }
                                    : {}
                                }
                                onClick={() => toggleSlot(court._id, slotTime)}
                                disabled={isUnavailable}
                                title={
                                  isPassed
                                    ? "This time has passed"
                                    : selectedSlots.length > 0 &&
                                        selectedSlots[0].courtId ===
                                          court._id &&
                                        !isConsecutive &&
                                        !isSelected
                                      ? "Select consecutive slots only"
                                      : ""
                                }
                                className={`
                              aspect-square rounded-lg transition-all duration-300 relative overflow-hidden flex flex-col items-center justify-center p-1
                              ${
                                isBooked
                                  ? "bg-red-500/80 border border-red-400 cursor-not-allowed opacity-75"
                                  : isPassed
                                    ? "bg-zinc-700/50 border border-zinc-600 cursor-not-allowed opacity-50"
                                    : isSelected
                                      ? "bg-[#2DD4BF] shadow-[0_0_15px_rgba(45,212,191,0.5)]"
                                      : selectedSlots.length > 0 &&
                                          selectedSlots[0].courtId ===
                                            court._id &&
                                          !isConsecutive
                                        ? "bg-zinc-700/50 border border-zinc-600 cursor-not-allowed opacity-50"
                                        : "bg-green-500/20 border border-green-400/60 hover:bg-green-500/30 hover:border-green-400"
                              }
                            `}
                              >
                                <span className="text-[9px] md:text-[10px] font-mono text-white/90 leading-tight text-center">
                                  {formatTime12(slotTime)} -{" "}
                                  {formatTime12(slotTime + 0.5)}
                                </span>
                                {isSelected && (
                                  <motion.div
                                    layoutId={`check-mobile-${court._id}-${slotTime}`}
                                    className="absolute inset-0 flex items-center justify-center"
                                  >
                                    <CheckCircle className="w-4 h-4 text-[#0F172A]" />
                                  </motion.div>
                                )}
                              </motion.button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Booking Drawer */}
      <AnimatePresence>
        {selectedSlots.length >= (selectedCourtType === "FUTSAL" ? 3 : 2) && (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-0 left-0 w-full z-50 bg-[#111] border-t border-white/10 p-4 md:p-6 lg:p-8 pb-safe md:pb-8 lg:pb-12 shadow-[0_-10px_40px_rgba(0,0,0,0.8)]"
          >
            <div className="max-w-7xl mx-auto flex flex-col gap-4 md:gap-6">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl bg-zinc-900 flex items-center justify-center border border-white/10 shrink-0">
                  <span className="text-lg md:text-xl lg:text-2xl font-bold text-white">
                    {selectedDuration}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm md:text-base lg:text-lg font-semibold text-white mb-1">
                    {selectedDuration === 1 ? "Hour" : "Hours"} Selected
                  </h3>
                  <p className="text-zinc-400 text-xs md:text-sm break-words">
                    {selectedCourt ? `${selectedCourt.name} • ` : ""}
                    {selectedSlots.length > 0 &&
                      (() => {
                        const sortedTimes = selectedSlots
                          .map((s) => s.slotTime)
                          .sort((a, b) => a - b);
                        const startTime = sortedTimes[0];
                        const endTime =
                          sortedTimes[sortedTimes.length - 1] + 0.5;
                        return `${formatTime12(startTime)} - ${formatTime12(
                          endTime,
                        )}`;
                      })()}
                  </p>
                  {discountAmount > 0 ? (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-zinc-500 line-through text-xs">
                        PKR {originalPrice.toLocaleString()}
                      </span>
                      <span className="text-[#2DD4BF] font-semibold text-sm">
                        PKR {totalPrice.toLocaleString()}
                      </span>
                      <span className="text-green-400 text-xs">
                        Save PKR {discountAmount.toLocaleString()}
                      </span>
                    </div>
                  ) : (
                    <p className="text-[#2DD4BF] font-semibold text-sm mt-1">
                      PKR {totalPrice.toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-2 md:gap-3 w-full">
                <Button
                  variant="ghost"
                  onClick={() => setSelectedSlots([])}
                  className="flex-1 md:flex-none px-4 md:px-6"
                >
                  Clear
                </Button>
                <Button
                  onClick={() => setShowModal(true)}
                  size="lg"
                  className="flex-1 md:flex-none md:min-w-[180px] lg:min-w-[200px] bg-[#2DD4BF] text-[#0F172A] hover:bg-[#14B8A6] text-sm md:text-base"
                >
                  Checkout <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 py-4 md:py-8">
          <div
            className="absolute inset-0 bg-black/90 backdrop-blur-md"
            onClick={() => {
              if (formStatus !== "loading") setShowModal(false);
            }}
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative bg-[#09090b] border border-white/10 p-4 md:p-6 lg:p-8 rounded-2xl md:rounded-3xl w-full max-w-md lg:max-w-5xl shadow-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden"
          >
            {/* Glossy Effect */}
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-[#2DD4BF]/10 rounded-full blur-[80px]" />

            {formStatus === "success" && createdBooking ? (
              <div className="relative z-10">
                {/* Header - Same for all screen sizes */}
                <div className="text-center mb-6 lg:mb-8">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-16 h-16 md:w-20 md:h-20 bg-[#2DD4BF] text-[#0F172A] rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6 shadow-[0_0_30px_rgba(45,212,191,0.4)]"
                  >
                    <CheckCircle className="w-8 h-8 md:w-10 md:h-10" />
                  </motion.div>
                  <h3 className="text-2xl md:text-3xl font-bold mb-2 md:mb-3 text-white">
                    Booking Confirmed!
                  </h3>
                  <p className="text-sm md:text-base text-zinc-400">
                    Your booking has been confirmed successfully.
                  </p>
                </div>

                {/* Content Layout - Responsive */}
                <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
                  {/* Left Column - Booking Details */}
                  <div className="flex-1 space-y-6">
                    <div className="bg-zinc-900/50 rounded-xl p-4 md:p-6 space-y-3 text-left">
                      <h4 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-4">
                        Booking Details
                      </h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-zinc-400 text-sm">
                            Booking ID:
                          </span>
                          <span className="text-white font-mono text-sm font-semibold">
                            #{createdBooking._id.slice(-8)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-zinc-400 text-sm">Court:</span>
                          <span className="text-white text-sm">
                            {typeof createdBooking.courtId === "object" &&
                            createdBooking.courtId?.name
                              ? createdBooking.courtId.name
                              : "Court"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-zinc-400 text-sm">Date:</span>
                          <span className="text-white text-sm">
                            {new Date(createdBooking.date).toLocaleDateString(
                              "en-US",
                              {
                                weekday: "short",
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              },
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-zinc-400 text-sm">Time:</span>
                          <span className="text-white text-sm">
                            {formatTime12(createdBooking.startTime)} -{" "}
                            {formatTime12(
                              createdBooking.startTime +
                                createdBooking.duration,
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-zinc-400 text-sm">
                            Duration:
                          </span>
                          <span className="text-white text-sm">
                            {createdBooking.duration} hour
                            {createdBooking.duration !== 1 ? "s" : ""}
                          </span>
                        </div>
                        {/* Price Breakdown */}
                        <div className="pt-2 border-t border-zinc-800">
                          {createdBooking.discountAmount > 0 ? (
                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-zinc-400 text-sm">
                                  Subtotal:
                                </span>
                                <span className="text-zinc-300 text-sm">
                                  PKR{" "}
                                  {createdBooking.originalPrice?.toLocaleString()}
                                </span>
                              </div>
                              {createdBooking.discounts?.map(
                                (d: AppliedDiscount, idx: number) => (
                                  <div
                                    key={idx}
                                    className="flex justify-between items-center"
                                  >
                                    <span className="text-green-400 text-sm">
                                      {d.name} (
                                      {d.type === "percentage"
                                        ? `${d.value}%`
                                        : `PKR ${d.value}`}
                                      )
                                    </span>
                                    <span className="text-green-400 text-sm">
                                      -PKR {d.amountSaved?.toLocaleString()}
                                    </span>
                                  </div>
                                ),
                              )}
                              <div className="flex justify-between items-center pt-2 border-t border-zinc-700">
                                <span className="text-zinc-300 text-sm font-semibold">
                                  Total:
                                </span>
                                <span className="text-[#2DD4BF] font-bold text-lg">
                                  PKR{" "}
                                  {createdBooking.totalPrice.toLocaleString()}
                                </span>
                              </div>
                              <div className="bg-green-500/10 border border-green-500/30 rounded-md px-2 py-1 text-center">
                                <span className="text-green-400 text-xs">
                                  You saved PKR{" "}
                                  {createdBooking.discountAmount?.toLocaleString()}
                                  !
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="flex justify-between items-center">
                              <span className="text-zinc-400 text-sm font-semibold">
                                Total Price:
                              </span>
                              <span className="text-[#2DD4BF] font-bold text-lg">
                                PKR {createdBooking.totalPrice.toLocaleString()}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column - QR Codes */}
                  <div className="flex-1 space-y-4 lg:space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                      <div>
                        <h4 className="text-sm font-semibold text-zinc-300 mb-3 text-center lg:text-left">
                          Entry Verification QR Code
                        </h4>
                        <div className="flex justify-center lg:justify-start">
                          <div className="bg-white p-3 md:p-4 rounded-xl inline-block">
                            <QRCode
                              value={`${
                                typeof window !== "undefined"
                                  ? window.location.origin
                                  : ""
                              }/booking/verify/${createdBooking._id}`}
                              size={160}
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-semibold text-zinc-300 mb-3 text-center lg:text-left">
                          Feedback QR Code
                        </h4>
                        <div className="flex justify-center lg:justify-start">
                          <div className="bg-white p-3 md:p-4 rounded-xl inline-block">
                            <QRCode
                              value={`${
                                typeof window !== "undefined"
                                  ? window.location.origin
                                  : ""
                              }/feedback/${createdBooking._id}`}
                              size={160}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Done Button */}
                <div className="mt-6 lg:mt-8">
                  <Button
                    onClick={() => {
                      setShowModal(false);
                      setFormStatus("idle");
                      setSelectedSlots([]);
                      setFormData({ name: "", email: "", phone: "" });
                      setCreatedBooking(null);
                      loadBookings();
                    }}
                    className="w-full bg-[#2DD4BF] text-[#0F172A] hover:bg-[#14B8A6]"
                  >
                    Done
                  </Button>
                </div>
              </div>
            ) : (
              <form
                onSubmit={handleBookingSubmit}
                className="space-y-4 md:space-y-6 relative z-10"
              >
                <div>
                  <h3 className="text-xl md:text-2xl font-bold text-white">
                    Checkout
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 mt-2 text-zinc-400 text-xs md:text-sm">
                    <span className="bg-zinc-800 px-2 py-1 rounded text-white">
                      {selectedDate.toLocaleDateString("en-US", {
                        weekday: "short",
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    <span>•</span>
                    {selectedSlots.length > 0 &&
                      (() => {
                        const sortedTimes = selectedSlots
                          .map((s) => s.slotTime)
                          .sort((a, b) => a - b);
                        const startTime = sortedTimes[0];
                        const endTime =
                          sortedTimes[sortedTimes.length - 1] + 0.5;
                        return (
                          <>
                            <span>
                              {formatTime12(startTime)} -{" "}
                              {formatTime12(endTime)}
                            </span>
                            <span>•</span>
                          </>
                        );
                      })()}
                    <span>
                      {selectedDuration}{" "}
                      {selectedDuration === 1 ? "Hour" : "Hours"}
                    </span>
                  </div>
                  {/* Price Breakdown */}
                  {selectedCourt && (
                    <div className="mt-4 bg-zinc-900/50 rounded-xl p-4">
                      <PriceBreakdown
                        originalPrice={originalPrice}
                        discounts={appliedDiscounts}
                        discountAmount={discountAmount}
                        totalPrice={totalPrice}
                      />
                    </div>
                  )}
                </div>

                {errorMessage && (
                  <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-4 text-red-400 text-sm">
                    {errorMessage}
                  </div>
                )}

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                      Player Name
                    </label>
                    <input
                      required
                      type="text"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-white focus:ring-2 focus:ring-[#2DD4BF]/50 focus:border-[#2DD4BF] transition-all outline-none"
                      placeholder="Enter full name"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                      Email Address
                    </label>
                    <input
                      required
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-white focus:ring-2 focus:ring-[#2DD4BF]/50 focus:border-[#2DD4BF] transition-all outline-none"
                      placeholder="name@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                      Phone Number <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-white focus:ring-2 focus:ring-[#2DD4BF]/50 focus:border-[#2DD4BF] transition-all outline-none"
                      placeholder="+92 300 1234567"
                      pattern="[+]?[0-9\s\-()]{10,}"
                      title="Please enter a valid phone number"
                    />
                  </div>
                </div>

                <div className="pt-4 flex flex-col sm:flex-row gap-3">
                  <Button
                    type="button"
                    variant="ghost"
                    className="flex-1 order-2 sm:order-1"
                    onClick={() => {
                      if (formStatus !== "loading") setShowModal(false);
                    }}
                    disabled={formStatus === "loading"}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 order-1 sm:order-2 bg-[#2DD4BF] text-[#0F172A] hover:bg-[#14B8A6]"
                    disabled={formStatus === "loading"}
                  >
                    {formStatus === "loading" ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      "Confirm Booking"
                    )}
                  </Button>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      )}

      <Footer />
    </div>
  );
}
