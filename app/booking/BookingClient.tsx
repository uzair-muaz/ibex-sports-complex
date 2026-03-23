"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Check,
  CheckCircle,
  Clock,
  Info,
  Loader2,
  X,
  Zap,
} from "lucide-react";

import { PriceBreakdown } from "@/components/PriceBreakdown";
import { Navbar } from "@/components/Navbar";
import { DiscountBanner } from "@/components/DiscountBanner";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";

import { getCourts } from "../actions/courts";
import {
  createBooking,
  getAvailableStartTimes,
  type AvailableStartTimeQuote,
} from "../actions/bookings";
import { COMPLEX_OPENING_DATE, type CourtType } from "@/types";
import { formatLocalDate, formatTime12 } from "@/lib/utils";
import { BUSINESS_TIMEZONE, toDateKeyInTimezone } from "@/lib/date-time";

type FormStatus = "idle" | "loading" | "success" | "error";

const durationPresets: { hours: number; label: string }[] = [
  { hours: 1, label: "60 mins" },
  { hours: 1.5, label: "90 mins" },
  { hours: 2, label: "2 hours" },
];

const sportHeadingMap: Record<CourtType, { title: string; subtitle: string }> =
  {
    PADEL: {
      title: "PADEL COURT",
      subtitle: "Professional panoramic glass court",
    },
    PICKLEBALL: {
      title: "PICKLEBALL COURT",
      subtitle: "Premium hard court with pro markings",
    },
    FUTSAL: {
      title: "FUTSAL COURT",
      subtitle: "Indoor futsal turf arena",
    },
    CRICKET: {
      title: "CRICKET NET",
      subtitle: "Full-length automated bowling lane",
    },
  };

function courtTypeLabel(type: CourtType): string {
  switch (type) {
    case "PADEL":
      return "Padel";
    case "CRICKET":
      return "Cricket";
    case "PICKLEBALL":
      return "Pickleball";
    case "FUTSAL":
      return "Futsal";
    default:
      return type;
  }
}

function formatEndTimeWithDay(startTime: number, duration: number) {
  const endAbs = startTime + duration;
  const dayInc = endAbs > 24;
  const endMod = ((endAbs % 24) + 24) % 24;
  return {
    endTime: endMod,
    dayInc,
    endLabel: `${formatTime12(endMod)}${dayInc ? " (Next Day)" : ""}`,
  };
}

function isHourInPeriod(
  hour: number,
  period?: { startHour?: number; endHour?: number; allDay?: boolean },
): boolean {
  if (!period) return false;
  if (period.allDay) return true;
  if (
    typeof period.startHour !== "number" ||
    typeof period.endHour !== "number"
  ) {
    return false;
  }
  const start = period.startHour;
  const end = period.endHour;
  if (start === end) return false;
  if (start < end) return hour >= start && hour < end;
  return hour >= start || hour < end;
}

function getHourDecimalInTimezone(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(date);
  const hourPart = parts.find((p) => p.type === "hour")?.value ?? "0";
  const minutePart = parts.find((p) => p.type === "minute")?.value ?? "0";
  const hour = Number(hourPart);
  const minute = Number(minutePart);
  return hour + minute / 60;
}

export default function BookingClient() {
  // Default to opening date if today is before it
  const getInitialDate = () => {
    const today = new Date();
    return today < COMPLEX_OPENING_DATE ? COMPLEX_OPENING_DATE : today;
  };

  const [selectedDate, setSelectedDate] = useState<Date>(getInitialDate());
  const [selectedCourtType, setSelectedCourtType] = useState<CourtType | null>(
    null,
  );
  const [selectedDurationHours, setSelectedDurationHours] = useState<number>(1);

  const [availableStartTimes, setAvailableStartTimes] = useState<
    AvailableStartTimeQuote[]
  >([]);
  const [selectedQuote, setSelectedQuote] =
    useState<AvailableStartTimeQuote | null>(null);

  const [isLoadingTypes, setIsLoadingTypes] = useState(true);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);

  const [activeCourtTypes, setActiveCourtTypes] = useState<CourtType[]>([]);
  const [selectedTypeCourts, setSelectedTypeCourts] = useState<any[]>([]);
  const [availabilityRefreshKey, setAvailabilityRefreshKey] = useState(0);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [nowTick, setNowTick] = useState<number>(Date.now());

  // Form state
  const [formData, setFormData] = useState({ name: "", email: "", phone: "" });
  const [formStatus, setFormStatus] = useState<FormStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [createdBooking, setCreatedBooking] = useState<any>(null);

  const dateString = useMemo(
    () => formatLocalDate(selectedDate),
    [selectedDate],
  );
  const todayBusinessKey = useMemo(
    () => toDateKeyInTimezone(new Date(nowTick), BUSINESS_TIMEZONE),
    [nowTick],
  );
  const openingBusinessKey = useMemo(
    () => toDateKeyInTimezone(COMPLEX_OPENING_DATE, BUSINESS_TIMEZONE),
    [],
  );
  const minSelectableDateKey = useMemo(
    () =>
      todayBusinessKey > openingBusinessKey
        ? todayBusinessKey
        : openingBusinessKey,
    [todayBusinessKey, openingBusinessKey],
  );
  const nowBusinessHourDecimal = useMemo(
    () => getHourDecimalInTimezone(new Date(nowTick), BUSINESS_TIMEZONE),
    [nowTick],
  );

  // Load court types on mount
  useEffect(() => {
    const loadTypes = async () => {
      setIsLoadingTypes(true);
      try {
        const result = await getCourts();
        if (result.success && result.courts.length > 0) {
          const types = [
            ...new Set(result.courts.map((c: any) => c.type)),
          ] as CourtType[];
          setActiveCourtTypes(types);
          if (!selectedCourtType && types.length > 0)
            setSelectedCourtType(types[0]);
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);
      } finally {
        setIsLoadingTypes(false);
      }
    };
    loadTypes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const loadSelectedTypeCourts = async () => {
      if (!selectedCourtType) return;
      try {
        const result = await getCourts(selectedCourtType);
        if (result.success) {
          setSelectedTypeCourts(result.courts);
        } else {
          setSelectedTypeCourts([]);
        }
      } catch {
        setSelectedTypeCourts([]);
      }
    };
    loadSelectedTypeCourts();
  }, [selectedCourtType]);

  useEffect(() => {
    const interval = setInterval(() => setNowTick(Date.now()), 30_000);
    return () => clearInterval(interval);
  }, []);

  // Load availability whenever (courtType, date, duration) changes
  useEffect(() => {
    const run = async () => {
      if (!selectedCourtType) return;
      setIsLoadingAvailability(true);
      setSelectedQuote(null);
      try {
        const result = await getAvailableStartTimes({
          courtType: selectedCourtType,
          date: dateString,
          duration: selectedDurationHours,
        });
        if (result.success) {
          setAvailableStartTimes(result.startTimes);
        } else {
          setAvailableStartTimes([]);
          setErrorMessage(result.error);
        }
      } catch (e: any) {
        setAvailableStartTimes([]);
        setErrorMessage(e?.message || "Failed to load availability");
      } finally {
        setIsLoadingAvailability(false);
      }
    };
    run();
  }, [
    selectedCourtType,
    dateString,
    selectedDurationHours,
    availabilityRefreshKey,
  ]);

  const selectedTimeRangeLabel = useMemo(() => {
    if (!selectedQuote) return "";
    const start = selectedQuote.startTime;
    const end = formatEndTimeWithDay(start, selectedDurationHours).endLabel;
    return `${formatTime12(start)} - ${end}`;
  }, [selectedQuote, selectedDurationHours]);

  const activeCourt = useMemo(
    () => selectedTypeCourts[0],
    [selectedTypeCourts],
  );

  const courtPricing = useMemo(() => {
    const fallback = activeCourt?.pricePerHour || 0;
    const periods = Array.isArray(activeCourt?.pricingPeriods)
      ? activeCourt.pricingPeriods
      : [];
    const peak = periods.find((p: any) => p.label === "peak");
    const offPeak = periods.find((p: any) => p.label === "off_peak");
    const formatRange = (period?: {
      startHour?: number;
      endHour?: number;
      allDay?: boolean;
    }) => {
      if (!period) return "N/A";
      if (period.allDay) return "All Day";
      if (
        typeof period.startHour !== "number" ||
        typeof period.endHour !== "number"
      ) {
        return "N/A";
      }
      return `${formatTime12(period.startHour)} - ${formatTime12(period.endHour)}`;
    };
    return {
      offPeak: offPeak?.pricePerHour ?? fallback,
      peak: peak?.pricePerHour ?? fallback,
      offPeakHours: formatRange(offPeak),
      peakHours: formatRange(peak),
      peakPeriod: peak,
    };
  }, [activeCourt]);

  const getIsPeakTime = useCallback(
    (hour: number) => {
      if (courtPricing.peakPeriod) {
        return isHourInPeriod(hour, courtPricing.peakPeriod);
      }
      return hour >= 17 || hour < 4;
    },
    [courtPricing.peakPeriod],
  );

  const slotsForDesign = useMemo(() => {
    return availableStartTimes.map((q, i) => {
      const end = formatEndTimeWithDay(
        q.startTime,
        selectedDurationHours,
      ).endLabel;
      const isSelected = selectedQuote?.startTime === q.startTime;
      const isPastSlot =
        dateString === todayBusinessKey && q.startTime < nowBusinessHourDecimal;
      return {
        id: `slot-${i}`,
        quote: q,
        time: formatTime12(q.startTime),
        end,
        isSelected,
        isPeak: getIsPeakTime(q.startTime),
        isPastSlot,
      };
    });
  }, [
    availableStartTimes,
    selectedDurationHours,
    selectedQuote,
    getIsPeakTime,
    dateString,
    todayBusinessKey,
    nowBusinessHourDecimal,
  ]);

  const orderedSlots = useMemo(() => {
    if (dateString !== todayBusinessKey) {
      return { upcoming: slotsForDesign, past: [] as typeof slotsForDesign };
    }
    return {
      upcoming: slotsForDesign.filter((slot) => !slot.isPastSlot),
      past: slotsForDesign.filter((slot) => slot.isPastSlot),
    };
  }, [slotsForDesign, dateString, todayBusinessKey]);

  useEffect(() => {
    if (!selectedQuote) return;
    if (dateString !== todayBusinessKey) return;
    if (selectedQuote.startTime < nowBusinessHourDecimal) {
      setSelectedQuote(null);
    }
  }, [selectedQuote, dateString, todayBusinessKey, nowBusinessHourDecimal]);

  const visibleDurationPresets = useMemo(() => {
    if (selectedCourtType === "FUTSAL") {
      return durationPresets.filter((d) => d.hours >= 1.5);
    }
    return durationPresets;
  }, [selectedCourtType]);

  useEffect(() => {
    if (selectedCourtType === "FUTSAL" && selectedDurationHours < 1.5) {
      setSelectedDurationHours(1.5);
    }
  }, [selectedCourtType, selectedDurationHours]);

  const calendarDays = useMemo(() => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const days: (Date | null)[] = [];
    const totalDays = new Date(year, month + 1, 0).getDate();
    const startDay = new Date(year, month, 1).getDay();
    for (let i = 0; i < startDay; i++) days.push(null);
    for (let i = 1; i <= totalDays; i++) days.push(new Date(year, month, i));
    return days;
  }, [selectedDate]);

  const calendarMonthLabel = useMemo(
    () =>
      selectedDate.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      }),
    [selectedDate],
  );

  const goToPreviousMonth = () => {
    const y = selectedDate.getFullYear();
    const m = selectedDate.getMonth();
    setSelectedDate(new Date(y, m - 1, 1));
    setSelectedQuote(null);
  };

  const goToNextMonth = () => {
    const y = selectedDate.getFullYear();
    const m = selectedDate.getMonth();
    setSelectedDate(new Date(y, m + 1, 1));
    setSelectedQuote(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourtType || !selectedQuote) return;
    if (formStatus === "loading") return;

    setFormStatus("loading");
    setErrorMessage("");
    try {
      const result = await createBooking({
        courtType: selectedCourtType,
        date: dateString,
        startTime: selectedQuote.startTime,
        duration: selectedDurationHours,
        userName: formData.name,
        userEmail: formData.email,
        userPhone: formData.phone,
      });

      if (result.success) {
        setCreatedBooking(result.booking);
        setFormStatus("success");
        setShowCheckoutModal(false);
      } else {
        setFormStatus("error");
        setErrorMessage(result.error || "Failed to create booking");
      }
    } catch (err: any) {
      setFormStatus("error");
      setErrorMessage(err?.message || "An error occurred");
    } finally {
      // no-op: status handles UI
    }
  };

  const resetAfterSuccess = () => {
    setFormStatus("idle");
    setErrorMessage("");
    setCreatedBooking(null);
    setSelectedQuote(null);
    setFormData({ name: "", email: "", phone: "" });
    setShowCheckoutModal(false);
    // Refresh availability for current selection
    setAvailabilityRefreshKey((k) => k + 1);
  };

  const renderSlotCard = (slot: (typeof slotsForDesign)[number]) => (
    <button
      key={slot.id}
      onClick={() => {
        if (!slot.isPastSlot) setSelectedQuote(slot.quote);
      }}
      disabled={slot.isPastSlot}
      className={`relative h-28 rounded-3xl border transition-all duration-300 flex flex-col items-start justify-between p-5 overflow-hidden ${
        slot.isPastSlot
          ? "bg-zinc-900/12 border-white/10 text-zinc-700 cursor-not-allowed opacity-55 bg-[repeating-linear-gradient(-45deg,rgba(255,255,255,0.02)_0px,rgba(255,255,255,0.02)_6px,transparent_6px,transparent_14px)]"
          : ""
      } ${
        slot.isSelected
          ? "bg-[#2DD4BF] border-[#2DD4BF] text-black scale-[0.98] shadow-[0_10px_30px_rgba(45,212,191,0.2)]"
          : "bg-zinc-900/40 border-white/10 hover:border-white/20 active:scale-95"
      }`}
    >
      <div className="flex justify-between w-full items-start">
        <span
          className={`text-[10px] font-black uppercase tracking-tighter ${slot.isSelected ? "text-black/60" : "text-zinc-700"}`}
        >
          START
        </span>
        {slot.isSelected ? <Check size={16} className="text-black" /> : null}
        {slot.isPeak && !slot.isSelected ? (
          <div className="w-1.5 h-1.5 rounded-full bg-[#2DD4BF]" />
        ) : null}
      </div>
      <div className="flex flex-col items-start">
        <span
          className={`text-xl font-black leading-none mb-1 tracking-tighter ${slot.isSelected ? "text-black" : "text-white"}`}
        >
          {slot.time}
        </span>
        <span
          className={`text-[9px] font-black uppercase tracking-[0.2em] ${slot.isSelected ? "text-black/40" : "text-zinc-700"}`}
        >
          UNTIL {slot.end}
        </span>
      </div>
    </button>
  );

  return (
    <div className="min-h-screen bg-[#050505] text-[#E0E0E0] overflow-x-hidden selection:bg-[#2DD4BF]/30">
      <Navbar />
      <DiscountBanner className="fixed top-16 md:top-20 left-0 right-0 z-40" />

      <main
        className={`transition-all duration-500 w-full ${selectedQuote ? "pb-104" : "pb-32"}`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-24 md:pt-28 lg:pt-32">
          <div className="mb-8 pb-6 border-b border-white/10">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter text-white mb-2 leading-[0.9]">
              RESERVE
              <br />
              YOUR SPOT.
            </h1>
            <p className="text-zinc-400 text-base md:text-lg max-w-xl mt-3">
              Real-time availability for our premium courts.
            </p>
          </div>

          {/* Sport selector */}
          <div className="mb-4 overflow-x-auto no-scrollbar flex gap-3">
            {(isLoadingTypes ? [] : activeCourtTypes).map((type) => (
              <button
                key={type}
                onClick={() => {
                  setSelectedCourtType(type);
                  setSelectedQuote(null);
                }}
                className={`flex-none px-8 py-3 rounded-full text-xs font-bold border transition-all ${
                  selectedCourtType === type
                    ? "bg-[#2DD4BF] border-[#2DD4BF] text-black "
                    : "bg-transparent border-white/10 text-zinc-500 hover:border-white/20"
                }`}
              >
                {courtTypeLabel(type).toUpperCase()}
              </button>
            ))}
          </div>

          {/* Duration selector (same logic, style-matched) */}
          <div className="mb-8 overflow-x-auto no-scrollbar flex gap-3">
            {visibleDurationPresets.map((d) => (
              <button
                key={d.hours}
                onClick={() => setSelectedDurationHours(d.hours)}
                className={`flex-none px-8 py-3 rounded-full text-xs font-bold border transition-all ${
                  selectedDurationHours === d.hours
                    ? "bg-[#2DD4BF] border-[#2DD4BF] text-black shadow-[0_0_20px_rgba(45,212,191,0.2)]"
                    : "bg-transparent border-white/10 text-zinc-500 hover:border-white/20"
                }`}
              >
                {d.label.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Date trigger */}
          <div className="mb-8">
            <button
              onClick={() => setIsDatePickerOpen(true)}
              className="w-full bg-zinc-900/40 border border-white/10 rounded-3xl p-6 flex items-center justify-between hover:border-[#2DD4BF]/40 transition-all group"
            >
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-[#2DD4BF]/10 rounded-2xl flex items-center justify-center text-[#2DD4BF] group-hover:bg-[#2DD4BF] group-hover:text-black transition-all">
                  <CalendarDays size={28} />
                </div>
                <div className="text-left">
                  <div className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-1">
                    Active Date
                  </div>
                <div className="text-xl font-semibold text-white tracking-tight">
                    {selectedDate
                      .toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                      .toUpperCase()}
                  </div>
                </div>
              </div>
              <ChevronRight
                size={24}
                className="text-zinc-400 group-hover:text-[#2DD4BF] transition-all"
              />
            </button>
          </div>

          {/* Court details */}
          <div className="mb-8">
            <div className="bg-zinc-900/40 border border-white/10 rounded-[2.5rem] p-8 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-6">
                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-zinc-600 group-hover:text-[#2DD4BF] transition-colors">
                  <Info size={20} />
                </div>
              </div>
              <div className="mb-6">
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight gradient-text mb-2">
                  {selectedCourtType
                    ? sportHeadingMap[selectedCourtType].title
                    : "COURT"}
                </h2>
                <p className="text-zinc-500 text-xs sm:text-sm font-medium tracking-wide">
                  {selectedCourtType
                    ? sportHeadingMap[selectedCourtType].subtitle
                    : "Premium Surface"}
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-zinc-800 flex items-center justify-center text-zinc-400 shrink-0">
                    <Clock size={20} />
                  </div>
                  <div>
                    <div className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-1">
                      Off-Peak
                    </div>
                  <div className="text-lg font-semibold text-white tracking-tight leading-none mb-1">
                      PKR {courtPricing.offPeak.toLocaleString()}/HR
                    </div>
                    <div className="text-[9px] font-black text-zinc-500 uppercase tracking-wider">
                      {courtPricing.offPeakHours}
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-4 border-l border-white/5 pl-0 sm:pl-6">
                  <div className="w-10 h-10 rounded-2xl bg-[#2DD4BF]/10 flex items-center justify-center text-[#2DD4BF] shrink-0">
                    <Zap size={20} />
                  </div>
                  <div>
                    <div className="text-[10px] font-black text-[#2DD4BF] uppercase tracking-widest mb-1">
                      Peak Hours
                    </div>
                  <div className="text-lg font-semibold text-white tracking-tight leading-none mb-1">
                      PKR {courtPricing.peak.toLocaleString()}/HR
                    </div>
                    <div className="text-[9px] font-black text-zinc-500 uppercase tracking-wider">
                      {courtPricing.peakHours}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* legend */}
          <div className="mb-6 flex flex-wrap gap-6 text-[9px] font-black text-zinc-700 uppercase tracking-[0.2em]">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-zinc-800" />
              Available
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#2DD4BF]" />
              Selected
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#2DD4BF]" />
              Peak Slot
            </div>
          </div>

          {/* slots */}
          <div className="grid grid-cols-2 gap-4">
            {isLoadingAvailability ? (
              <div className="col-span-2 text-zinc-500 flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-[#2DD4BF]" />
              </div>
            ) : slotsForDesign.length === 0 ? (
              <div className="col-span-2 text-zinc-500 text-center py-12 bg-zinc-900/20 border border-white/10 rounded-3xl">
                No available slots for selected date and duration.
              </div>
            ) : (
              <>
                {orderedSlots.upcoming.map((slot) => renderSlotCard(slot))}
                {orderedSlots.past.length > 0 ? (
                  <div className="col-span-2 mt-2 mb-1 flex items-center gap-3">
                    <div className="h-px flex-1 bg-white/10" />
                    <span className="text-[9px] font-black uppercase tracking-[0.25em] text-zinc-600">
                      Passed Slots
                    </span>
                    <div className="h-px flex-1 bg-white/10" />
                  </div>
                ) : null}
                {orderedSlots.past.map((slot) => renderSlotCard(slot))}
              </>
            )}
          </div>
        </div>
      </main>

      {/* Date picker modal */}
      <AnimatePresence>
        {isDatePickerOpen && (
          <div className="fixed inset-0 z-100 flex items-end sm:items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDatePickerOpen(false)}
              className="absolute inset-0 bg-black/95 backdrop-blur-xl"
            />
            <motion.div
              initial={{ y: "100%", scale: 0.95 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: "100%", scale: 0.95 }}
              className="relative w-full max-w-md bg-zinc-900 rounded-[3rem] border border-zinc-800 p-8 overflow-hidden shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-black text-white tracking-tighter uppercase">
                  Select Date
                </h3>
                <button
                  onClick={() => setIsDatePickerOpen(false)}
                  className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-zinc-500 hover:text-white transition-all"
                >
                  <X size={24} />
                </button>
              </div>
              <div className="mb-5 flex items-center justify-between">
                <button
                  type="button"
                  onClick={goToPreviousMonth}
                  className="w-10 h-10 rounded-xl border border-zinc-800 bg-zinc-800/40 flex items-center justify-center text-zinc-400 hover:text-white hover:border-zinc-700 transition-all"
                  aria-label="Previous month"
                >
                  <ChevronLeft size={18} />
                </button>
                <div className="text-sm font-black uppercase tracking-[0.16em] text-zinc-300">
                  {calendarMonthLabel}
                </div>
                <button
                  type="button"
                  onClick={goToNextMonth}
                  className="w-10 h-10 rounded-xl border border-zinc-800 bg-zinc-800/40 flex items-center justify-center text-zinc-400 hover:text-white hover:border-zinc-700 transition-all"
                  aria-label="Next month"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
              <div className="grid grid-cols-7 gap-2 mb-4">
                {["S", "M", "T", "W", "T", "F", "S"].map((d) => (
                  <div
                    key={d}
                    className="text-center text-[10px] font-black text-zinc-700 py-2"
                  >
                    {d}
                  </div>
                ))}
                {calendarDays.map((date, i) =>
                  (() => {
                    const isEmptyCell = !date;
                    const isPastDate =
                      !!date && formatLocalDate(date) < minSelectableDateKey;
                    const isSelected =
                      !!date &&
                      date.toDateString() === selectedDate.toDateString();
                    return (
                      <button
                        key={i}
                        disabled={isEmptyCell || isPastDate}
                        onClick={() => {
                          if (date && !isPastDate) {
                            setSelectedDate(date);
                            setSelectedQuote(null);
                            setIsDatePickerOpen(false);
                          }
                        }}
                        className={`h-12 rounded-2xl flex items-center justify-center text-sm font-black transition-all ${
                          isEmptyCell ? "opacity-0 pointer-events-none" : ""
                        } ${
                          isPastDate
                            ? "text-zinc-700 bg-zinc-800/25 border border-zinc-800 opacity-45 cursor-not-allowed"
                            : ""
                        } ${
                          isSelected
                            ? "bg-[#2DD4BF] text-black shadow-[0_0_20px_rgba(45,212,191,0.4)]"
                            : isPastDate
                              ? ""
                              : "text-zinc-500 hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        {date?.getDate()}
                      </button>
                    );
                  })(),
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Checkout modal (logic unchanged) */}
      <AnimatePresence>
        {showCheckoutModal && selectedQuote && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-120 flex items-center justify-center p-4"
          >
            <div
              className="absolute inset-0 bg-black/90"
              onClick={() => setShowCheckoutModal(false)}
            />
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              className="relative w-full max-w-2xl bg-zinc-900 rounded-3xl border border-white/10 p-6 space-y-4"
            >
              <h3 className="text-white text-2xl font-black tracking-tighter">
                CHECKOUT
              </h3>
              <div className="text-zinc-400 text-xs">
                {dateString} •{" "}
                {selectedCourtType ? courtTypeLabel(selectedCourtType) : ""} •{" "}
                {selectedTimeRangeLabel}
              </div>
              {errorMessage ? (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">
                  {errorMessage}
                </div>
              ) : null}
              <form onSubmit={handleSubmit} className="space-y-3">
                <input
                  required
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Player Name"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-white outline-none"
                />
                <input
                  required
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="Email Address"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-white outline-none"
                />
                <input
                  required
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="Phone Number"
                  pattern="[+]?[0-9\\s\\-()]{10,}"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-white outline-none"
                />
                <PriceBreakdown
                  originalPrice={selectedQuote.originalPrice}
                  discounts={selectedQuote.appliedDiscounts}
                  discountAmount={selectedQuote.discountAmount}
                  totalPrice={selectedQuote.totalPrice}
                />
                <button
                  type="submit"
                  disabled={formStatus === "loading"}
                  className="w-full h-14 rounded-full bg-[#2DD4BF] text-black font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3"
                >
                  {formStatus === "loading" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : null}
                  {formStatus === "loading"
                    ? "Processing..."
                    : "Confirm Booking"}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action bar */}
      <AnimatePresence>
        {selectedQuote && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 z-60 p-6"
          >
            <div className="w-full max-w-7xl mx-auto bg-white rounded-[3.5rem] p-8 shadow-[0_-20px_80px_rgba(0,0,0,0.8)] text-black border border-black/5">
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-zinc-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-zinc-100 rounded-xl flex items-center justify-center text-zinc-400">
                    <Zap size={18} />
                  </div>
                  <div>
                    <div className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">
                      Sport & Date
                    </div>
                    <div className="text-sm font-semibold tracking-tight">
                      {selectedCourtType
                        ? courtTypeLabel(selectedCourtType).toUpperCase()
                        : "SPORT"}{" "}
                      •{" "}
                      {selectedDate
                        .toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })
                        .toUpperCase()}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">
                    Duration
                  </div>
                  <div className="text-sm font-semibold tracking-tight">
                    {selectedDurationHours * 60} MINS
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between mb-8">
                <div>
                  <div className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-1">
                    Reservation
                  </div>
                  <div className="text-xl font-semibold tracking-tight leading-none">
                    {selectedTimeRangeLabel.toUpperCase()}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-1">
                    Total
                  </div>
                  {selectedQuote.discountAmount > 0 &&
                  selectedQuote.originalPrice > selectedQuote.totalPrice ? (
                    <div className="text-right leading-tight">
                      <div className="text-zinc-400 text-sm line-through">
                        PKR {selectedQuote.originalPrice.toLocaleString()}
                      </div>
                      <div className="text-3xl font-semibold tracking-tight leading-none">
                        PKR {selectedQuote.totalPrice.toLocaleString()}
                      </div>
                    </div>
                  ) : (
                    <div className="text-3xl font-semibold tracking-tight leading-none">
                      PKR {selectedQuote.totalPrice.toLocaleString()}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setSelectedQuote(null)}
                  className="w-16 h-16 rounded-full border border-zinc-200 flex items-center justify-center text-zinc-400 hover:text-black transition-colors"
                >
                  <ChevronLeft size={28} />
                </button>
                <button
                  onClick={() => setShowCheckoutModal(true)}
                  className="flex-1 h-16 rounded-full font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 transition-all active:scale-95 bg-black text-white hover:bg-zinc-800 shadow-xl"
                >
                  CONFIRM BOOKING
                  <ChevronRight size={20} className="text-[#2DD4BF]" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success modal */}
      <AnimatePresence>
        {formStatus === "success" && createdBooking ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-60 flex items-center justify-center px-4 py-4 md:py-8"
          >
            <div
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
              onClick={resetAfterSuccess}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative bg-[#09090b] border border-white/10 p-4 md:p-6 lg:p-8 rounded-2xl md:rounded-3xl w-full max-w-lg shadow-2xl"
            >
              <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-[#2DD4BF]/10 rounded-full blur-[80px]" />
              <div className="relative space-y-6 z-10 text-white">
                <div className="text-center space-y-3">
                  <div className="w-16 h-16 mx-auto rounded-full bg-[#2DD4BF]/10 border border-[#2DD4BF]/30 flex items-center justify-center">
                    <CheckCircle className="w-8 h-8 text-[#2DD4BF]" />
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold">
                    Booking Confirmed!
                  </h3>
                  <p className="text-zinc-400 text-sm md:text-base">
                    Your booking is confirmed. Please pay 50% advance.
                  </p>
                </div>

                <div className="bg-zinc-900/50 rounded-xl border border-white/10 p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400 text-sm">Booking ID</span>
                    <span className="text-white font-mono text-sm font-medium">
                      #{createdBooking._id.slice(-8)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400 text-sm">Court</span>
                    <span className="text-white text-sm font-medium">
                      {typeof createdBooking.courtId === "object" &&
                      createdBooking.courtId?.name
                        ? createdBooking.courtId.name
                        : "Court"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400 text-sm">Date</span>
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

                  {(() => {
                    const start = createdBooking.startTime;
                    const duration = createdBooking.duration;
                    const { endLabel } = formatEndTimeWithDay(start, duration);
                    return (
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-400 text-sm">Time</span>
                        <span className="text-white text-sm font-medium">
                          {formatTime12(start)} - {endLabel}
                        </span>
                      </div>
                    );
                  })()}

                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400 text-sm">Total</span>
                    {(() => {
                      const popupOriginalPrice =
                        Number(createdBooking.originalPrice ?? selectedQuote?.originalPrice ?? createdBooking.totalPrice) || 0;
                      const popupTotalPrice =
                        Number(createdBooking.totalPrice ?? selectedQuote?.totalPrice ?? 0) || 0;
                      const popupDiscountAmount =
                        Number(createdBooking.discountAmount ?? selectedQuote?.discountAmount ?? 0) || 0;
                      const hasDiscount =
                        popupDiscountAmount > 0 && popupOriginalPrice > popupTotalPrice;
                      return hasDiscount ? (
                        <div className="text-right">
                          <div className="text-zinc-500 text-xs line-through">
                            PKR {popupOriginalPrice.toLocaleString()}
                          </div>
                          <div className="text-[#2DD4BF] font-semibold">
                            PKR {popupTotalPrice.toLocaleString()}
                          </div>
                        </div>
                      ) : (
                        <span className="text-[#2DD4BF] font-semibold">
                          PKR {popupTotalPrice.toLocaleString()}
                        </span>
                      );
                    })()}
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    className="flex-1 bg-[#2DD4BF] text-[#0F172A] hover:bg-[#14B8A6]"
                    onClick={resetAfterSuccess}
                  >
                    Done
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <style
        dangerouslySetInnerHTML={{
          __html:
            ".no-scrollbar::-webkit-scrollbar{display:none}.no-scrollbar{-ms-overflow-style:none;scrollbar-width:none}",
        }}
      />
      <Footer />
    </div>
  );
}
