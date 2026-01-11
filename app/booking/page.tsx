"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { OPERATING_HOURS, CourtType } from "@/types";
import { getCourts } from "../actions/courts";
import { getBookingsByDate, createBooking } from "../actions/bookings";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export default function BookingPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedCourtType, setSelectedCourtType] =
    useState<CourtType>("PADEL");
  const [courts, setCourts] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [selectedSlots, setSelectedSlots] = useState<
    { courtId: string; slotTime: number }[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectionError, setSelectionError] = useState<string>("");

  // Form State
  const [formData, setFormData] = useState({ name: "", email: "", phone: "" });
  const [formStatus, setFormStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    window.scrollTo(0, 0);
    loadCourts();
  }, [selectedCourtType]);

  useEffect(() => {
    loadBookings();
  }, [selectedDate, selectedCourtType]);

  const loadCourts = async () => {
    const result = await getCourts(selectedCourtType);
    if (result.success) {
      setCourts(result.courts);
      setSelectedSlots([]); // Reset selection when court type changes
    }
  };

  const loadBookings = async () => {
    setIsLoading(true);
    try {
      const dateString = selectedDate.toISOString().split("T")[0];
      const result = await getBookingsByDate(dateString);
      if (result.success) {
        // Filter bookings for selected court type
        const filtered = result.bookings.filter(
          (b: any) =>
            b.courtId?.type === selectedCourtType && b.status !== "cancelled"
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
    
    // Check if slotTime is exactly 0.5 hours before min or after max
    return (
      Math.abs(slotTime - (minTime - 0.5)) < 0.01 ||
      Math.abs(slotTime - (maxTime + 0.5)) < 0.01
    );
  };

  const toggleSlot = (courtId: string, slotTime: number) => {
    if (isSlotBooked(courtId, slotTime)) {
      setSelectionError("This slot is already booked.");
      setTimeout(() => setSelectionError(""), 3000);
      return;
    }

    const existingIndex = selectedSlots.findIndex(
      (s) => s.courtId === courtId && s.slotTime === slotTime
    );

    if (existingIndex >= 0) {
      // Deselecting a slot
      const newSlots = [...selectedSlots];
      newSlots.splice(existingIndex, 1);
      
      // If removing a slot leaves less than 2 slots, clear all
      if (newSlots.length < 2) {
        setSelectedSlots([]);
        setSelectionError("Minimum booking is 1 hour (2 consecutive slots).");
        setTimeout(() => setSelectionError(""), 3000);
      } else {
        setSelectedSlots(newSlots);
        setSelectionError("");
      }
    } else {
      // Selecting a new slot
      setSelectionError("");
      
      // If no slots selected yet, start with this one
      if (selectedSlots.length === 0) {
        setSelectedSlots([{ courtId, slotTime }]);
        setSelectionError("Select another consecutive slot to complete 1 hour minimum booking.");
        setTimeout(() => setSelectionError(""), 3000);
        return;
      }

      // Check if same court
      const firstCourt = selectedSlots[0].courtId;
      if (firstCourt !== courtId) {
        // Different court - replace selection
        setSelectedSlots([{ courtId, slotTime }]);
        setSelectionError("Select another consecutive slot to complete 1 hour minimum booking.");
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
        [...prev, { courtId, slotTime }].sort((a, b) => a.slotTime - b.slotTime)
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

    // Minimum booking is 1 hour (2 slots of 30 minutes each)
    if (selectedSlots.length < 2) {
      setErrorMessage("Minimum booking time is 1 hour (2 consecutive slots).");
      return;
    }

    setFormStatus("loading");
    setErrorMessage("");

    try {
      const startTime = sortedTimes[0];
      // Duration in hours: number of slots * 0.5 hours per slot
      const duration = selectedSlots.length * 0.5;

      const result = await createBooking({
        courtType: selectedCourtType,
        date: selectedDate.toISOString().split("T")[0],
        startTime,
        duration,
        userName: formData.name,
        userEmail: formData.email,
        userPhone: formData.phone,
      });

      if (result.success) {
        setFormStatus("success");
        setTimeout(() => {
          setShowModal(false);
          setFormStatus("idle");
          setSelectedSlots([]);
          setFormData({ name: "", email: "", phone: "" });
          loadBookings();
        }, 2000);
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

  // Generate 30-minute slots (e.g., 4.0, 4.5, 5.0, 5.5, ...)
  const timeSlots: number[] = [];
  for (let hour = OPERATING_HOURS.start; hour < OPERATING_HOURS.end; hour++) {
    timeSlots.push(hour);
    timeSlots.push(hour + 0.5);
  }

  const selectedDuration = selectedSlots.length * 0.5; // Duration in hours
  const selectedCourt = courts.find((c) => c._id === selectedSlots[0]?.courtId);
  const totalPrice = selectedCourt
    ? selectedCourt.pricePerHour * selectedDuration
    : 0;

  return (
    <div className="min-h-screen bg-black text-white relative">
      <Navbar />

      <div className="fixed top-0 left-0 w-full h-[50vh] bg-gradient-to-b from-[#2DD4BF]/10 to-transparent pointer-events-none" />

      <div className="pt-20 md:pt-24 lg:pt-32 pb-20 md:pb-24 px-4 md:px-6">
        <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 lg:space-y-12 relative z-10">
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
              <div className="bg-zinc-900/50 p-1 rounded-2xl border border-white/10 flex flex-wrap md:flex-nowrap">
                {(
                  ["PADEL", "CRICKET", "PICKLEBALL", "FUTSAL"] as CourtType[]
                ).map((type) => (
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
            </div>
          </div>

          {/* Date & Info */}
          <div className="flex flex-col gap-4 md:gap-6">
            <DatePicker
              date={selectedDate}
              onDateChange={(date) => {
                if (date) {
                  setSelectedDate(date);
                }
              }}
              minDate={new Date()}
            />

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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
              </div>
              
              {selectionError && (
                <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-lg px-4 py-2 text-xs md:text-sm text-yellow-400 max-w-md">
                  {selectionError}
                </div>
              )}
            </div>
          </div>

          {/* Main Booking Grid */}
          {isLoading ? (
            <div className="flex items-center justify-center py-24">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2DD4BF]"></div>
            </div>
          ) : (
            <>
              {/* Desktop Grid View */}
              <div className="hidden lg:block glass-panel rounded-3xl overflow-hidden p-1">
                <div className="overflow-x-auto">
                  <div className="min-w-[800px] grid grid-cols-[130px_1fr]">
                    {/* Time Slots Column */}
                    <div className="border-r border-white/5 bg-black/20">
                      <div className="h-24 flex items-center justify-center border-b border-white/5 text-zinc-500 text-xs font-mono uppercase tracking-widest">
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
                            className="h-7 flex items-center justify-center text-xs text-zinc-600 font-mono border-b border-dashed border-white/5"
                          >
                            {startHour}:{startMin}-{endHour}:{endMin}
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
                          </div>

                          <div className="">
                            {timeSlots.map((slotTime) => {
                              const isBooked = isSlotBooked(court._id, slotTime);
                              const isSelected = isSlotSelected(
                                court._id,
                                slotTime
                              );

                              return (
                                <div
                                  key={slotTime}
                                  className="h-7 p-0.5 border-b border-white/5"
                                >
                                <motion.button
                                  whileHover={!isBooked && (selectedSlots.length === 0 || isSlotConsecutive(court._id, slotTime)) ? { scale: 0.98 } : {}}
                                  whileTap={!isBooked && (selectedSlots.length === 0 || isSlotConsecutive(court._id, slotTime)) ? { scale: 0.95 } : {}}
                                  onClick={() =>
                                    toggleSlot(court._id, slotTime)
                                  }
                                  disabled={isBooked}
                                  title={
                                    selectedSlots.length > 0 && 
                                    selectedSlots[0].courtId === court._id && 
                                    !isSlotConsecutive(court._id, slotTime) && 
                                    !isSelected
                                      ? "Select consecutive slots only"
                                      : ""
                                  }
                                  className={`
                                    w-full h-full rounded transition-all duration-300 relative overflow-hidden
                                    ${
                                      isBooked
                                        ? "bg-red-500/80 border border-red-400 cursor-not-allowed opacity-75"
                                        : isSelected
                                          ? "bg-[#2DD4BF] shadow-[0_0_15px_rgba(45,212,191,0.5)]"
                                          : selectedSlots.length > 0 && 
                                            selectedSlots[0].courtId === court._id && 
                                            !isSlotConsecutive(court._id, slotTime)
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
                    </div>

                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                      {timeSlots.map((slotTime) => {
                        const isBooked = isSlotBooked(court._id, slotTime);
                        const isSelected = isSlotSelected(court._id, slotTime);
                        const startHour = Math.floor(slotTime);
                        const startMin = slotTime % 1 === 0 ? "00" : "30";
                        const endTime = slotTime + 0.5;
                        const endHour = Math.floor(endTime);
                        const endMin = endTime % 1 === 0 ? "00" : "30";

                        const isConsecutive = isSlotConsecutive(court._id, slotTime);
                        const canSelect = selectedSlots.length === 0 || isConsecutive;
                        
                        return (
                          <motion.button
                            key={slotTime}
                            whileHover={!isBooked && canSelect ? { scale: 0.95 } : {}}
                            whileTap={!isBooked && canSelect ? { scale: 0.9 } : {}}
                            onClick={() => toggleSlot(court._id, slotTime)}
                            disabled={isBooked}
                            title={
                              selectedSlots.length > 0 && 
                              selectedSlots[0].courtId === court._id && 
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
                                  : isSelected
                                    ? "bg-[#2DD4BF] shadow-[0_0_15px_rgba(45,212,191,0.5)]"
                                    : selectedSlots.length > 0 && 
                                      selectedSlots[0].courtId === court._id && 
                                      !isConsecutive
                                      ? "bg-zinc-700/50 border border-zinc-600 cursor-not-allowed opacity-50"
                                      : "bg-green-500/20 border border-green-400/60 hover:bg-green-500/30 hover:border-green-400"
                              }
                            `}
                          >
                            <span className="text-[10px] font-mono text-white/90 leading-tight text-center">
                              {startHour}:{startMin}
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

          {/* Booking Drawer / Modal */}
      <AnimatePresence>
        {selectedSlots.length >= 2 && (
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
                        const startHour = Math.floor(sortedTimes[0]);
                        const startMin = sortedTimes[0] % 1 === 0 ? "00" : "30";
                        const endTime =
                          sortedTimes[sortedTimes.length - 1] + 0.5;
                        const endHour = Math.floor(endTime);
                        const endMin = endTime % 1 === 0 ? "00" : "30";
                        return `${startHour}:${startMin} - ${endHour}:${endMin} • `;
                      })()}
                    Total: PKR {totalPrice.toFixed(2)}
                  </p>
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
            className="relative bg-[#09090b] border border-white/10 p-4 md:p-6 lg:p-8 rounded-2xl md:rounded-3xl w-full max-w-md shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
          >
            {/* Glossy Effect */}
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-[#2DD4BF]/10 rounded-full blur-[80px]" />

            {formStatus === "success" ? (
              <div className="text-center py-8 md:py-12 relative z-10">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-16 h-16 md:w-20 md:h-20 bg-[#2DD4BF] text-[#0F172A] rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6 shadow-[0_0_30px_rgba(45,212,191,0.4)]"
                >
                  <CheckCircle className="w-8 h-8 md:w-10 md:h-10" />
                </motion.div>
                <h3 className="text-2xl md:text-3xl font-bold mb-2 md:mb-3 text-white">
                  Confirmed
                </h3>
                <p className="text-sm md:text-base text-zinc-400">
                  Your booking has been confirmed successfully.
                </p>
              </div>
            ) : (
              <form
                onSubmit={handleBookingSubmit}
                className="space-y-4 md:space-y-6 relative z-10"
              >
                <div>
                  <h3 className="text-xl md:text-2xl font-bold text-white">Checkout</h3>
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
                        const startHour = Math.floor(sortedTimes[0]);
                        const startMin = sortedTimes[0] % 1 === 0 ? "00" : "30";
                        const endTime =
                          sortedTimes[sortedTimes.length - 1] + 0.5;
                        const endHour = Math.floor(endTime);
                        const endMin = endTime % 1 === 0 ? "00" : "30";
                        return (
                          <>
                            <span>
                              {startHour}:{startMin} - {endHour}:{endMin}
                            </span>
                            <span>•</span>
                          </>
                        );
                      })()}
                    <span>
                      {selectedDuration}{" "}
                      {selectedDuration === 1 ? "Hour" : "Hours"}
                    </span>
                    {selectedCourt && <span>•</span>}
                    {selectedCourt && <span>PKR {totalPrice.toFixed(2)}</span>}
                  </div>
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
                      Phone (Optional)
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-white focus:ring-2 focus:ring-[#2DD4BF]/50 focus:border-[#2DD4BF] transition-all outline-none"
                      placeholder="+1 (555) 123-4567"
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
                    {formStatus === "loading"
                      ? "Processing..."
                      : "Confirm Booking"}
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
