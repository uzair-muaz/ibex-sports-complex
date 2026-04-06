"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronRight, Clock, Info, Zap } from "lucide-react";
import { useSession } from "next-auth/react";

import { BookingSectionHeader } from "@/components/booking/BookingSectionHeader";
import { BookingChipSelector } from "@/components/booking/BookingChipSelector";
import { BookingDatePickerModal } from "@/components/booking/BookingDatePickerModal";
import { BookingSlotsLegend } from "@/components/booking/BookingSlotsLegend";
import { BookingSlotsGrid } from "@/components/booking/BookingSlotsGrid";
import { BookingCheckoutModal } from "@/components/booking/BookingCheckoutModal";
import { BookingActionBar } from "@/components/booking/BookingActionBar";
import { BookingSuccessModal } from "@/components/booking/BookingSuccessModal";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";

import { getCourts } from "../actions/courts";
import {
  createBooking,
  getQuickSlotCourtAvailability,
  type AvailableStartTimeQuote,
} from "../actions/bookings";
import { COMPLEX_OPENING_DATE, type CourtType } from "@/types";
import { formatLocalDate, formatTime12 } from "@/lib/utils";
import { useBusinessTime } from "@/components/booking/hooks/useBusinessTime";
import { useBookingAvailability } from "@/components/booking/hooks/useBookingAvailability";

type FormStatus = "idle" | "loading" | "success" | "error";
type CheckoutFormErrors = {
  name?: string;
  email?: string;
  phone?: string;
};
type CourtRecord = {
  type?: CourtType;
  pricePerHour?: number;
  pricingPeriods?: Array<{
    label?: string;
    startHour?: number;
    endHour?: number;
    allDay?: boolean;
    pricePerHour?: number;
  }>;
};

type CreatedBooking = {
  _id: string;
  courtId?: { name?: string } | string;
  date: string;
  startTime: number;
  duration: number;
  totalPrice: number;
  originalPrice?: number;
  discountAmount?: number;
};

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

export default function BookingClient() {
  const { data: session } = useSession();
  const userRole = session?.user?.role;
  const canQuickCheck = userRole === "admin" || userRole === "super_admin";

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

  const [selectedQuote, setSelectedQuote] =
    useState<AvailableStartTimeQuote | null>(null);

  const [isLoadingTypes, setIsLoadingTypes] = useState(true);

  const [activeCourtTypes, setActiveCourtTypes] = useState<CourtType[]>([]);
  const [allCourts, setAllCourts] = useState<CourtRecord[]>([]);
  const [selectedTypeCourts, setSelectedTypeCourts] = useState<CourtRecord[]>(
    [],
  );
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);

  // Form state
  const [formData, setFormData] = useState({ name: "", email: "", phone: "" });
  const [formErrors, setFormErrors] = useState<CheckoutFormErrors>({});
  const [formStatus, setFormStatus] = useState<FormStatus>("idle");
  const [checkoutError, setCheckoutError] = useState("");
  const [createdBooking, setCreatedBooking] = useState<CreatedBooking | null>(
    null,
  );

  // Quick booking check (read-only)
  const [quickCheckOpen, setQuickCheckOpen] = useState(false);
  const [quickCheckLoading, setQuickCheckLoading] = useState(false);
  const [quickCheckError, setQuickCheckError] = useState<string | null>(null);
  const [quickCheckSlots, setQuickCheckSlots] = useState<
    Array<{
      startTime: number;
      availableCourtCount: number;
      totalCourtCount: number;
    }>
  >([]);

  const handleAvailabilityBeforeLoad = useCallback(() => {
    setSelectedQuote(null);
  }, []);

  const dateString = useMemo(
    () => formatLocalDate(selectedDate),
    [selectedDate],
  );
  const { todayBusinessKey, minSelectableDateKey, nowBusinessHourDecimal } =
    useBusinessTime(COMPLEX_OPENING_DATE);

  const dateKeyToLocalDate = (key: string) => {
    const [y, m, d] = key.split("-").map(Number);
    return new Date(y, m - 1, d);
  };

  const quickCheckMinDate = useMemo(() => {
    const biz = dateKeyToLocalDate(minSelectableDateKey);
    return COMPLEX_OPENING_DATE > biz ? COMPLEX_OPENING_DATE : biz;
  }, [minSelectableDateKey]);

  const [quickCheckDate, setQuickCheckDate] = useState<Date>(selectedDate);
  const quickCheckDateKey = useMemo(
    () => formatLocalDate(quickCheckDate),
    [quickCheckDate],
  );

  // Load court types on mount
  useEffect(() => {
    const loadTypes = async () => {
      setIsLoadingTypes(true);
      try {
        const result = await getCourts();
        if (result.success && result.courts.length > 0) {
          const courts = result.courts as CourtRecord[];
          setAllCourts(courts);

          const types = [
            ...new Set(courts.map((c: CourtRecord) => c.type)),
          ] as CourtType[];
          setActiveCourtTypes(types);

          // Default to the first court type, and derive courts locally from the
          // already-fetched list to avoid a second network call.
          if (!selectedCourtType && types.length > 0) {
            const firstType = types[0];
            setSelectedCourtType(firstType);
            setSelectedTypeCourts(courts.filter((c) => c.type === firstType));
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoadingTypes(false);
      }
    };
    loadTypes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedCourtType) {
      setSelectedTypeCourts([]);
      return;
    }

    // If we don't have courts cached yet, keep current state until `loadTypes` finishes.
    if (allCourts.length === 0) return;

    setSelectedTypeCourts(
      allCourts.filter((c) => c.type === selectedCourtType),
    );
  }, [selectedCourtType, allCourts]);

  const { availableStartTimes, isLoadingAvailability, refreshAvailability } =
    useBookingAvailability({
      selectedCourtType,
      dateString,
      selectedDurationHours,
      onBeforeLoad: handleAvailabilityBeforeLoad,
    });

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
    const peak = periods.find((p) => p.label === "peak");
    const offPeak = periods.find((p) => p.label === "off_peak");
    const hasSplitPricing = Boolean(peak && offPeak);
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
      hasSplitPricing,
      basePrice: fallback,
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

  const bookableSlotsForGrid = useMemo(() => {
    return availableStartTimes
      .filter(
        (q) =>
          dateString !== todayBusinessKey ||
          q.startTime >= nowBusinessHourDecimal,
      )
      .map((q, i) => {
        const end = formatEndTimeWithDay(
          q.startTime,
          selectedDurationHours,
        ).endLabel;
        const isSelected = selectedQuote?.startTime === q.startTime;
        return {
          id: `slot-${i}`,
          quote: q,
          time: formatTime12(q.startTime),
          end,
          isSelected,
          isPeak: getIsPeakTime(q.startTime),
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

  useEffect(() => {
    if (!showCheckoutModal) return;
    setFormData({ name: "", email: "", phone: "" });
    setFormErrors({});
    setFormStatus("idle");
    setCheckoutError("");
  }, [showCheckoutModal]);

  const handleFieldChange = useCallback(
    (field: "name" | "email" | "phone", value: string) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      setFormErrors((prev) => ({ ...prev, [field]: undefined }));
      setCheckoutError("");
    },
    [],
  );

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

  const loadQuickCheck = useCallback(
    async (overrideDateKey?: string) => {
      if (!selectedCourtType) return;

      setQuickCheckLoading(true);
      setQuickCheckError(null);
      try {
        const result = await getQuickSlotCourtAvailability({
          courtType: selectedCourtType,
          date: overrideDateKey ?? quickCheckDateKey,
          duration: selectedDurationHours,
        });

        if (!result.success) {
          setQuickCheckSlots([]);
          setQuickCheckError(
            result.error || "Failed to load quick availability",
          );
          return;
        }

        setQuickCheckSlots(result.slots ?? []);
      } catch (e: unknown) {
        setQuickCheckSlots([]);
        setQuickCheckError(
          e instanceof Error ? e.message : "Failed to load quick availability",
        );
      } finally {
        setQuickCheckLoading(false);
      }
    },
    [quickCheckDateKey, selectedCourtType, selectedDurationHours],
  );

  const handleSubmit = async () => {
    if (!selectedCourtType || !selectedQuote) return;
    if (formStatus === "loading") return;

    const nextErrors: CheckoutFormErrors = {};
    const email = formData.email.trim().toLowerCase();
    const phoneDigits = formData.phone.replace(/\D/g, "");
    const isPakMobile =
      (phoneDigits.length === 11 && phoneDigits.startsWith("03")) ||
      (phoneDigits.length === 12 && phoneDigits.startsWith("92"));

    if (!formData.name.trim()) {
      nextErrors.name = "Please enter your name.";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      nextErrors.email = "Please enter a valid email address.";
    }

    if (!isPakMobile) {
      nextErrors.phone =
        "Enter a valid Pakistani mobile number (03XXXXXXXXX or 92XXXXXXXXXX).";
    }

    if (Object.keys(nextErrors).length > 0) {
      setFormStatus("error");
      setFormErrors(nextErrors);
      return;
    }

    setFormErrors({});
    const normalizedPhone = phoneDigits.startsWith("03")
      ? `+92${phoneDigits.slice(1)}`
      : `+${phoneDigits}`;

    setFormStatus("loading");
    setCheckoutError("");
    try {
      const result = await createBooking({
        courtType: selectedCourtType,
        date: dateString,
        startTime: selectedQuote.startTime,
        duration: selectedDurationHours,
        userName: formData.name.trim(),
        userEmail: email,
        userPhone: normalizedPhone,
      });

      if (result.success) {
        setCreatedBooking(result.booking);
        setFormStatus("success");
        setShowCheckoutModal(false);
      } else {
        setFormStatus("error");
        setCheckoutError(result.error || "Failed to create booking");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An error occurred";
      setFormStatus("error");
      setCheckoutError(message);
    } finally {
      // no-op: status handles UI
    }
  };

  const resetAfterSuccess = () => {
    setFormStatus("idle");
    setCheckoutError("");
    setCreatedBooking(null);
    setSelectedQuote(null);
    setFormData({ name: "", email: "", phone: "" });
    setShowCheckoutModal(false);
    // Refresh availability for current selection
    refreshAvailability();
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#E0E0E0] overflow-x-hidden selection:bg-[#2DD4BF]/30">
      <main
        className={`transition-all duration-500 w-full ${selectedQuote ? "pb-104" : "pb-32"}`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-24 md:pt-28 lg:pt-32">
          <BookingSectionHeader
            title={
              <>
                RESERVE
                <br />
                YOUR SPOT.
              </>
            }
            subtitle="Real-time availability for our premium courts."
          />
          <div className="mb-6 rounded-2xl border border-[#2DD4BF]/40 bg-[#2DD4BF]/10 px-4 py-3 text-sm text-zinc-200">
            A 50% advance payment is required to confirm bookings. Reservations
            without advance may be cancelled. All advance payments are
            non-refundable.
          </div>

          {/* Date trigger */}
          <div className="mb-6 flex flex-col lg:flex-row gap-3">
            <div className="flex-1">
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
          </div>

          {/* Sport selector */}
          <BookingChipSelector
            className="mb-6"
            items={(isLoadingTypes ? [] : activeCourtTypes).map((type) => ({
              key: type,
              label: courtTypeLabel(type).toUpperCase(),
            }))}
            activeKey={selectedCourtType}
            onSelect={(type) => {
              setSelectedCourtType(type as CourtType);
              setSelectedQuote(null);
            }}
          />

          {canQuickCheck && (
            <div className="mb-6 flex justify-end">
              <Button
                type="button"
                disabled={
                  !selectedCourtType || isLoadingTypes || quickCheckLoading
                }
                variant="outline"
                onClick={() => {
                  const initialDate =
                    selectedDate >= quickCheckMinDate
                      ? selectedDate
                      : quickCheckMinDate;
                  setQuickCheckDate(initialDate);
                  setQuickCheckOpen(true);
                  loadQuickCheck(formatLocalDate(initialDate));
                }}
                className="h-[52px] rounded-3xl bg-zinc-900/40 border-white/10 text-zinc-200 hover:border-[#2DD4BF]/40"
              >
                Check Slots
              </Button>
            </div>
          )}

          {/* Court details */}
          <div className="mb-6">
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
              {selectedTypeCourts.length > 0 ? (
                courtPricing.hasSplitPricing ? (
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
                ) : (
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-[#2DD4BF]/10 flex items-center justify-center text-[#2DD4BF] shrink-0">
                      <Clock size={20} />
                    </div>
                    <div>
                      <div className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-1">
                        Price per Hour
                      </div>
                      <div className="text-lg font-semibold text-white tracking-tight leading-none">
                        PKR {courtPricing.basePrice.toLocaleString()}/HR
                      </div>
                    </div>
                  </div>
                )
              ) : (
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-[#2DD4BF]/10 flex items-center justify-center text-[#2DD4BF] shrink-0">
                    <Clock size={20} />
                  </div>
                  <div>
                    <div className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-1">
                      Price per Hour
                    </div>
                    <div className="text-lg font-semibold text-white tracking-tight leading-none">
                      Loading...
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
            {/* legend */}
            <BookingSlotsLegend />

            {/* Duration selector (same logic, style-matched) */}
            <BookingChipSelector
              className="sm:max-w-[min(100%,28rem)] sm:justify-end"
              items={visibleDurationPresets.map((d) => ({
                key: d.hours.toString(),
                label: d.label.toUpperCase(),
              }))}
              activeKey={selectedDurationHours.toString()}
              onSelect={(hours) => setSelectedDurationHours(Number(hours))}
            />
          </div>

          <BookingSlotsGrid
            isLoadingAvailability={isLoadingAvailability}
            isSelectedDateToday={dateString === todayBusinessKey}
            slots={bookableSlotsForGrid}
            onSelectQuote={(quote) => setSelectedQuote(quote)}
          />
        </div>
      </main>

      <Dialog
        open={quickCheckOpen}
        onOpenChange={(open) => {
          setQuickCheckOpen(open);
          if (open) {
            const initialDate =
              selectedDate >= quickCheckMinDate
                ? selectedDate
                : quickCheckMinDate;
            setQuickCheckDate(initialDate);
            loadQuickCheck(formatLocalDate(initialDate));
          }
        }}
      >
        <DialogContent className="bg-zinc-950 border-zinc-800 max-w-4xl text-white">
          <DialogHeader>
            <DialogTitle>Quick booking check</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Green = all courts available, Red = fully booked, Amber fill =
              partially booked, Grey = closed (past time or no courts). Small
              amber dot on a cell = peak pricing window for this court type
              (same as booking page).
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-xs text-zinc-400">Available</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-xs text-zinc-400">Booked</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-500" />
              <span className="text-xs text-zinc-400">Partially booked</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-zinc-700" />
              <span className="text-xs text-zinc-400">
                Closed (past time / no courts)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 ring-1 ring-amber-400/50" />
              <span className="text-xs text-zinc-400">Peak pricing</span>
            </div>
          </div>

          {quickCheckLoading ? (
            <div className="mt-6 grid grid-cols-4 gap-2">
              {Array.from({ length: 16 }).map((_, i) => (
                <div
                  key={i}
                  className="h-8 rounded-xl bg-zinc-900/60 animate-pulse"
                />
              ))}
            </div>
          ) : quickCheckError ? (
            <div className="mt-6 bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">
              {quickCheckError}
            </div>
          ) : (
            <div className="mt-6">
              <div className="flex items-center gap-3 flex-wrap mb-4">
                <div className="w-[210px]">
                  <div className="text-xs text-zinc-400 mb-2">Date</div>
                  <DatePicker
                    date={quickCheckDate}
                    onDateChange={(d) => {
                      if (!d) return;
                      setQuickCheckDate(d);
                      loadQuickCheck(formatLocalDate(d));
                    }}
                    variant="admin"
                    minDate={quickCheckMinDate}
                  />
                </div>
              </div>
              <div className="text-xs text-zinc-400 mb-3">
                {selectedCourtType ? selectedCourtType : "COURT"} •{" "}
                {quickCheckDateKey} • {selectedDurationHours}h
              </div>

              {quickCheckSlots.length === 0 ? (
                <div className="mb-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-red-200 text-xs">
                  No available slots found. Showing booked/closed states below.
                </div>
              ) : null}

              <div className="grid grid-cols-4 gap-2 max-h-[55vh] overflow-y-auto pr-2">
                {(() => {
                  const slotMap = new Map<
                    number,
                    { availableCourtCount: number; totalCourtCount: number }
                  >();

                  for (const s of quickCheckSlots) {
                    slotMap.set(s.startTime, {
                      availableCourtCount: s.availableCourtCount,
                      totalCourtCount: s.totalCourtCount,
                    });
                  }

                  return Array.from({ length: 48 }).map((_, i) => {
                    const startTime = Number((i * 0.5).toFixed(1));
                    const isPastSlot =
                      quickCheckDateKey === todayBusinessKey &&
                      startTime < nowBusinessHourDecimal;

                    const slot = slotMap.get(startTime);
                    const totalCourtCount = slot?.totalCourtCount ?? 0;
                    const availableCourtCount = slot?.availableCourtCount ?? 0;

                    let status: "available" | "booked" | "partial" | "closed";
                    if (totalCourtCount === 0) {
                      status = "closed";
                    } else if (isPastSlot) {
                      status = "closed";
                    } else if (availableCourtCount === 0) {
                      status = "booked";
                    } else if (availableCourtCount === totalCourtCount) {
                      status = "available";
                    } else {
                      status = "partial";
                    }

                    const baseClass =
                      status === "available"
                        ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-200"
                        : status === "booked"
                          ? "bg-red-500/20 border-red-500/40 text-red-200"
                          : status === "partial"
                            ? "bg-amber-500/20 border-amber-500/40 text-amber-200"
                            : "bg-zinc-800/60 border-zinc-700 text-zinc-500";

                    const isPeakCell = getIsPeakTime(startTime);

                    return (
                      <div
                        key={startTime}
                        className={`relative h-10 rounded-xl border flex items-center justify-center text-[11px] font-black tracking-tight ${baseClass}`}
                        title={formatTime12(startTime)}
                      >
                        {isPeakCell ? (
                          <span
                            className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-amber-400 ring-1 ring-amber-400/50"
                            aria-hidden
                          />
                        ) : null}
                        {formatTime12(startTime)}
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <BookingDatePickerModal
        isOpen={isDatePickerOpen}
        onClose={() => setIsDatePickerOpen(false)}
        calendarMonthLabel={calendarMonthLabel}
        goToPreviousMonth={goToPreviousMonth}
        goToNextMonth={goToNextMonth}
        calendarDays={calendarDays}
        selectedDate={selectedDate}
        minSelectableDateKey={minSelectableDateKey}
        onSelectDate={(date) => {
          setSelectedDate(date);
          setSelectedQuote(null);
          setIsDatePickerOpen(false);
        }}
      />

      <BookingCheckoutModal
        open={showCheckoutModal}
        selectedQuote={selectedQuote}
        dateString={dateString}
        durationHours={selectedDurationHours}
        selectedTimeRangeLabel={selectedTimeRangeLabel}
        errorMessage={checkoutError}
        formStatus={formStatus}
        formData={formData}
        formErrors={formErrors}
        onClose={() => setShowCheckoutModal(false)}
        onFieldChange={handleFieldChange}
        onSubmit={handleSubmit}
      />
      <BookingActionBar
        selectedQuote={selectedQuote}
        selectedCourtLabel={
          selectedCourtType
            ? courtTypeLabel(selectedCourtType).toUpperCase()
            : "SPORT"
        }
        selectedDateLabel={selectedDate
          .toLocaleDateString("en-US", { month: "short", day: "numeric" })
          .toUpperCase()}
        selectedDurationMinutes={selectedDurationHours * 60}
        selectedTimeRangeLabel={selectedTimeRangeLabel}
        onBack={() => setSelectedQuote(null)}
        onConfirm={() => setShowCheckoutModal(true)}
      />
      <BookingSuccessModal
        open={formStatus === "success"}
        createdBooking={createdBooking}
        selectedQuote={selectedQuote}
        onDone={resetAfterSuccess}
      />

      <style
        dangerouslySetInnerHTML={{
          __html:
            ".no-scrollbar::-webkit-scrollbar{display:none}.no-scrollbar{-ms-overflow-style:none;scrollbar-width:none}",
        }}
      />
    </div>
  );
}
