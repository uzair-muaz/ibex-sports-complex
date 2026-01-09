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
    { courtId: string; hour: number }[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

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

  const isSlotBooked = (courtId: string, hour: number) => {
    return bookings.some((b) => {
      const bookingCourtId =
        typeof b.courtId === "object" ? b.courtId._id : b.courtId;
      if (bookingCourtId !== courtId) return false;

      const bookingStart = b.startTime;
      const bookingEnd = b.startTime + b.duration;

      // Check if hour falls within booking range
      return hour >= bookingStart && hour < bookingEnd;
    });
  };

  const isSlotSelected = (courtId: string, hour: number) => {
    return selectedSlots.some((s) => s.courtId === courtId && s.hour === hour);
  };

  const toggleSlot = (courtId: string, hour: number) => {
    if (isSlotBooked(courtId, hour)) return;

    const existingIndex = selectedSlots.findIndex(
      (s) => s.courtId === courtId && s.hour === hour
    );

    if (existingIndex >= 0) {
      const newSlots = [...selectedSlots];
      newSlots.splice(existingIndex, 1);
      setSelectedSlots(newSlots);
    } else {
      // Logic for multiple selection - must be same court and contiguous
      if (selectedSlots.length > 0) {
        const firstCourt = selectedSlots[0].courtId;
        if (firstCourt !== courtId) {
          // Different court - replace selection
          setSelectedSlots([{ courtId, hour }]);
          return;
        }

        // Same court - check if contiguous
        const sortedHours = [...selectedSlots.map((s) => s.hour), hour].sort(
          (a, b) => a - b
        );
        let isContiguous = true;
        for (let i = 0; i < sortedHours.length - 1; i++) {
          if (sortedHours[i + 1] !== sortedHours[i] + 1) {
            isContiguous = false;
            break;
          }
        }

        if (!isContiguous) {
          // Not contiguous - start new selection from this hour
          setSelectedSlots([{ courtId, hour }]);
          return;
        }
      }

      setSelectedSlots((prev) =>
        [...prev, { courtId, hour }].sort((a, b) => a.hour - b.hour)
      );
    }
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSlots.length === 0) return;

    const sortedHours = selectedSlots.map((s) => s.hour).sort((a, b) => a - b);
    let isContiguous = true;
    for (let i = 0; i < sortedHours.length - 1; i++) {
      if (sortedHours[i + 1] !== sortedHours[i] + 1) {
        isContiguous = false;
        break;
      }
    }

    if (!isContiguous) {
      setErrorMessage("Please select contiguous time slots.");
      return;
    }

    if (selectedSlots.length < 1) {
      setErrorMessage("Minimum booking time is 1 hour.");
      return;
    }

    setFormStatus("loading");
    setErrorMessage("");

    try {
      const startTime = sortedHours[0];
      const duration = selectedSlots.length;

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

  const hours = Array.from(
    { length: OPERATING_HOURS.end - OPERATING_HOURS.start },
    (_, i) => OPERATING_HOURS.start + i
  );

  const selectedDuration = selectedSlots.length;
  const selectedCourt = courts.find((c) => c._id === selectedSlots[0]?.courtId);
  const totalPrice = selectedCourt
    ? selectedCourt.pricePerHour * selectedDuration
    : 0;

  return (
    <div className="min-h-screen bg-black text-white relative">
      <Navbar />

      <div className="fixed top-0 left-0 w-full h-[50vh] bg-gradient-to-b from-[#2DD4BF]/10 to-transparent pointer-events-none" />

      <div className="pt-32 pb-24 px-6">
        <div className="max-w-7xl mx-auto space-y-12 relative z-10">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-8 border-b border-white/5">
            <div className="space-y-4">
              <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-white">
                Reserve
                <br />
                Your Spot.
              </h1>
              <p className="text-zinc-400 text-lg max-w-md">
                Real-time availability for our premium courts.
              </p>
            </div>

            <div className="flex flex-col gap-4">
              <div className="bg-zinc-900/50 p-1 rounded-2xl border border-white/10 flex">
                {(
                  ["PADEL", "CRICKET", "PICKLEBALL", "FUTSAL"] as CourtType[]
                ).map((type) => (
                  <button
                    key={type}
                    onClick={() => {
                      setSelectedCourtType(type);
                      setSelectedSlots([]);
                    }}
                    className={`px-8 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
                      selectedCourtType === type
                        ? "bg-[#2DD4BF] text-[#0F172A] shadow-[0_0_20px_rgba(45,212,191,0.3)] scale-[1.02]"
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    {type === "PADEL"
                      ? "Padel Tennis"
                      : type === "CRICKET"
                        ? "Cricket Nets"
                        : type === "PICKLEBALL"
                          ? "Pickleball"
                          : "Futsal"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Date & Info */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <DatePicker
              date={selectedDate}
              onDateChange={(date) => {
                if (date) {
                  setSelectedDate(date);
                }
              }}
              minDate={new Date()}
            />

            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#5EEAD4]/60 border border-[#5EEAD4]/80" />
                <span className="text-zinc-500">Available</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#2DD4BF]" />
                <span className="text-zinc-500">Selected</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-zinc-700/80 border border-zinc-600" />
                <span className="text-zinc-500">Booked</span>
              </div>
            </div>
          </div>

          {/* Main Booking Grid */}
          {isLoading ? (
            <div className="flex items-center justify-center py-24">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2DD4BF]"></div>
            </div>
          ) : (
            <div className="glass-panel rounded-3xl overflow-hidden p-1">
              <div className="overflow-x-auto">
                <div className="min-w-[800px] grid grid-cols-[100px_1fr]">
                  {/* Hours Column */}
                  <div className="border-r border-white/5 bg-black/20">
                    <div className="h-24 flex items-center justify-center border-b border-white/5 text-zinc-500 text-xs font-mono uppercase tracking-widest">
                      Time
                    </div>
                    {hours.map((hour) => (
                      <div
                        key={hour}
                        className="h-14 flex items-center justify-center text-xs text-zinc-600 font-mono border-b border-dashed border-white/5"
                      >
                        {hour}:00
                      </div>
                    ))}
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
                          {hours.map((hour) => {
                            const isBooked = isSlotBooked(court._id, hour);
                            const isSelected = isSlotSelected(court._id, hour);

                            return (
                              <div
                                key={hour}
                                className="h-14 p-1 border-b border-white/5"
                              >
                                <motion.button
                                  whileHover={!isBooked ? { scale: 0.98 } : {}}
                                  whileTap={!isBooked ? { scale: 0.95 } : {}}
                                  onClick={() => toggleSlot(court._id, hour)}
                                  disabled={isBooked}
                                  className={`
                                    w-full h-full rounded-lg transition-all duration-300 relative overflow-hidden
                                    ${
                                      isBooked
                                        ? "bg-zinc-800/50 border border-zinc-700/60 cursor-not-allowed opacity-75"
                                        : isSelected
                                          ? "bg-[#2DD4BF] shadow-[0_0_15px_rgba(45,212,191,0.5)]"
                                          : "bg-[#5EEAD4]/20 border border-[#5EEAD4]/40 hover:bg-[#5EEAD4]/30 hover:border-[#5EEAD4]/60"
                                    }
                                  `}
                                >
                                  {isSelected && (
                                    <motion.div
                                      layoutId="check"
                                      className="absolute inset-0 flex items-center justify-center text-[#0F172A]"
                                    >
                                      <CheckCircle className="w-4 h-4" />
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
          )}
        </div>
      </div>

      {/* Booking Drawer / Modal */}
      <AnimatePresence>
        {selectedSlots.length > 0 && (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-0 left-0 w-full z-50 bg-[#111] border-t border-white/10 p-6 md:p-8 pb-12 shadow-[0_-10px_40px_rgba(0,0,0,0.8)]"
          >
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-2xl bg-zinc-900 flex items-center justify-center border border-white/10">
                  <span className="text-2xl font-bold text-white">
                    {selectedDuration}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    Hours Selected
                  </h3>
                  <p className="text-zinc-400 text-sm">
                    {selectedCourt ? `${selectedCourt.name} • ` : ""}
                    Total: PKR {totalPrice.toFixed(2)}
                  </p>
                </div>
              </div>
              <div className="flex gap-4 w-full md:w-auto">
                <Button
                  variant="ghost"
                  onClick={() => setSelectedSlots([])}
                  className="flex-1 md:flex-none"
                >
                  Clear
                </Button>
                <Button
                  onClick={() => setShowModal(true)}
                  size="lg"
                  className="flex-1 md:flex-none min-w-[200px] bg-[#2DD4BF] text-[#0F172A] hover:bg-[#14B8A6]"
                >
                  Proceed to Checkout <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/90 backdrop-blur-md"
            onClick={() => {
              if (formStatus !== "loading") setShowModal(false);
            }}
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative bg-[#09090b] border border-white/10 p-8 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden"
          >
            {/* Glossy Effect */}
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-[#2DD4BF]/10 rounded-full blur-[80px]" />

            {formStatus === "success" ? (
              <div className="text-center py-12 relative z-10">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-20 h-20 bg-[#2DD4BF] text-[#0F172A] rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(45,212,191,0.4)]"
                >
                  <CheckCircle className="w-10 h-10" />
                </motion.div>
                <h3 className="text-3xl font-bold mb-3 text-white">
                  Confirmed
                </h3>
                <p className="text-zinc-400">
                  Your booking has been confirmed successfully.
                </p>
              </div>
            ) : (
              <form
                onSubmit={handleBookingSubmit}
                className="space-y-6 relative z-10"
              >
                <div>
                  <h3 className="text-2xl font-bold text-white">Checkout</h3>
                  <div className="flex items-center gap-2 mt-2 text-zinc-400 text-sm">
                    <span className="bg-zinc-800 px-2 py-1 rounded text-white">
                      {selectedDate.toLocaleDateString("en-US", {
                        weekday: "short",
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    <span>•</span>
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

                <div className="pt-4 flex gap-3">
                  <Button
                    type="button"
                    variant="ghost"
                    className="flex-1"
                    onClick={() => {
                      if (formStatus !== "loading") setShowModal(false);
                    }}
                    disabled={formStatus === "loading"}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-[#2DD4BF] text-[#0F172A] hover:bg-[#14B8A6]"
                    isLoading={formStatus === "loading"}
                  >
                    Confirm Booking
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
