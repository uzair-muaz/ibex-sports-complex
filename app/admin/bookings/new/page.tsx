"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowLeft, Loader2 } from "lucide-react";

import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminAvailableSlotGrid } from "@/components/admin/AdminAvailableSlotGrid";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBusinessTime } from "@/components/booking/hooks/useBusinessTime";
import { formatAdminBookingEndLabel } from "@/lib/admin-booking-slots";
import { formatLocalDate, formatTime12 } from "@/lib/utils";
import {
  createBooking,
  getAvailableStartTimes,
  type AvailableStartTimeQuote,
} from "@/app/actions/bookings";
import { getCourts } from "@/app/actions/courts";
import { COMPLEX_OPENING_DATE, type Court, type CourtType } from "@/types";
import { toast } from "sonner";

const COURT_TYPES: CourtType[] = ["PADEL", "CRICKET", "PICKLEBALL", "FUTSAL"];

function dateKeyToLocalDate(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export default function AdminNewBookingPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { todayBusinessKey, minSelectableDateKey, nowBusinessHourDecimal } =
    useBusinessTime(COMPLEX_OPENING_DATE);

  const minPickDate = useMemo(() => {
    const biz = dateKeyToLocalDate(minSelectableDateKey);
    return COMPLEX_OPENING_DATE > biz ? COMPLEX_OPENING_DATE : biz;
  }, [minSelectableDateKey]);

  const userRole = (session?.user as { role?: string })?.role;
  const isAdmin = userRole === "admin" || userRole === "super_admin";

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  useEffect(() => {
    if (!selectedDate && minSelectableDateKey) {
      setSelectedDate(minPickDate);
    }
  }, [selectedDate, minSelectableDateKey, minPickDate]);

  useEffect(() => {
    if (selectedDate && selectedDate < minPickDate) {
      setSelectedDate(minPickDate);
    }
  }, [selectedDate, minPickDate]);

  const dateStr = selectedDate ? formatLocalDate(selectedDate) : "";

  useEffect(() => {
    if (session && !isAdmin) {
      router.push("/admin/bookings");
    }
  }, [session, isAdmin, router]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingQuotes, setIsLoadingQuotes] = useState(false);
  const [quotableQuotes, setQuotableQuotes] = useState<
    AvailableStartTimeQuote[]
  >([]);
  const [courts, setCourts] = useState<Court[]>([]);

  const [formData, setFormData] = useState({
    courtType: "PADEL" as CourtType,
    durationHours: 1,
    userName: "",
    userEmail: "",
    userPhone: "",
  });

  const [selectedQuote, setSelectedQuote] =
    useState<AvailableStartTimeQuote | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const durationPresets = useMemo(() => {
    if (formData.courtType === "FUTSAL") {
      return [
        { hours: 1.5, label: "1h 30m" },
        { hours: 2, label: "2h" },
        { hours: 2.5, label: "2h 30m" },
        { hours: 3, label: "3h" },
      ];
    }
    return [
      { hours: 1, label: "1 hour" },
      { hours: 1.5, label: "1h 30m" },
      { hours: 2, label: "2 hours" },
    ];
  }, [formData.courtType]);

  useEffect(() => {
    const first = durationPresets[0]?.hours ?? 1;
    setFormData((prev) =>
      prev.durationHours === first ? prev : { ...prev, durationHours: first },
    );
  }, [formData.courtType, durationPresets]);

  useEffect(() => {
    if (!session || !isAdmin || !formData.courtType) return;
    (async () => {
      try {
        const result = await getCourts(formData.courtType);
        if (result.success) setCourts(result.courts as Court[]);
        else setCourts([]);
      } catch {
        setCourts([]);
      }
    })();
  }, [session, isAdmin, formData.courtType]);

  const fetchQuotes = useCallback(async () => {
    if (!formData.courtType || !dateStr) {
      setQuotableQuotes([]);
      return;
    }
    setIsLoadingQuotes(true);
    setSelectedQuote(null);
    setErrorMessage(null);
    try {
      const result = await getAvailableStartTimes({
        courtType: formData.courtType,
        date: dateStr,
        duration: formData.durationHours,
      });
      if (!result.success) {
        setQuotableQuotes([]);
        setErrorMessage(result.error ?? "Could not load available times.");
        return;
      }
      let list = result.startTimes ?? [];
      if (dateStr === todayBusinessKey) {
        list = list.filter((q) => q.startTime >= nowBusinessHourDecimal);
      }
      setQuotableQuotes(list);
    } catch (e) {
      setQuotableQuotes([]);
      setErrorMessage(e instanceof Error ? e.message : "Failed to load slots.");
    } finally {
      setIsLoadingQuotes(false);
    }
  }, [
    formData.courtType,
    formData.durationHours,
    dateStr,
    todayBusinessKey,
    nowBusinessHourDecimal,
  ]);

  useEffect(() => {
    fetchQuotes();
  }, [fetchQuotes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!selectedQuote) {
      setErrorMessage("Please select a start time");
      return;
    }
    if (!formData.userName.trim()) {
      setErrorMessage("Please enter the customer name");
      return;
    }
    if (!formData.userEmail.trim()) {
      setErrorMessage("Please enter the customer email");
      return;
    }
    if (!formData.userPhone.trim()) {
      setErrorMessage("Please enter the customer phone");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createBooking({
        courtType: formData.courtType,
        date: dateStr,
        startTime: selectedQuote.startTime,
        duration: formData.durationHours,
        userName: formData.userName.trim(),
        userEmail: formData.userEmail.trim(),
        userPhone: formData.userPhone.trim(),
      });

      if (!result.success || !result.booking) {
        throw new Error(result.error || "Failed to create booking");
      }

      toast.success("Booking created successfully");
      const raw = result.booking as { _id?: string; id?: string };
      const id = raw._id ?? raw.id;
      router.push(`/admin/bookings/${id ?? ""}`);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to create booking",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <AdminLayout
      title="Create Booking"
      description="Pick date, duration, and an available start time. Court is assigned automatically."
    >
      <div className="space-y-8 p-6">
        <Button
          variant="ghost"
          onClick={() => router.push("/admin/bookings")}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Bookings
        </Button>

        {errorMessage && (
          <div
            role="alert"
            className="flex gap-2 rounded-lg border border-red-900 bg-red-950/50 px-4 py-3 text-sm text-red-200"
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            <p>{errorMessage}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="courtType" className="text-zinc-300">
                Court Type
              </Label>
              <Select
                value={formData.courtType}
                onValueChange={(v) =>
                  setFormData({
                    ...formData,
                    courtType: v as CourtType,
                  })
                }
              >
                <SelectTrigger
                  id="courtType"
                  className="bg-zinc-900 border-zinc-700 text-white"
                >
                  <SelectValue placeholder="Select court type" />
                </SelectTrigger>
                <SelectContent>
                  {COURT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date" className="text-zinc-300">
                Date
              </Label>
              <DatePicker
                date={selectedDate}
                onDateChange={(date) => {
                  if (date) setSelectedDate(date);
                }}
                variant="admin"
                minDate={minPickDate}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label className="text-zinc-300">Duration</Label>
              <div className="flex flex-wrap gap-2">
                {durationPresets.map((preset) => (
                  <button
                    key={preset.hours}
                    type="button"
                    onClick={() =>
                      setFormData({ ...formData, durationHours: preset.hours })
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
          </div>

          {formData.courtType && dateStr && (
            <div className="space-y-3">
              <p className="text-sm text-zinc-400">
                Available start times (past times today are hidden)
              </p>
              <AdminAvailableSlotGrid
                quotes={quotableQuotes}
                selectedQuote={selectedQuote}
                durationHours={formData.durationHours}
                courts={courts}
                onSelect={(q) => setSelectedQuote(q)}
                isLoading={isLoadingQuotes}
                emptyMessage="No available slots for this date and duration."
                formatTime12={formatTime12}
                formatEndLabel={(start, dur) =>
                  formatAdminBookingEndLabel(start, dur)
                }
              />
            </div>
          )}

          {selectedQuote && (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 text-sm text-zinc-300 space-y-2">
              <p className="font-medium text-white">Price preview</p>
              <div className="flex flex-wrap gap-x-6 gap-y-1">
                <span>
                  Original: Rs. {selectedQuote.originalPrice.toLocaleString()}
                </span>
                {selectedQuote.totalPrice !== selectedQuote.originalPrice ? (
                  <span className="text-teal-300">
                    After discounts: Rs.{" "}
                    {selectedQuote.totalPrice.toLocaleString()}
                  </span>
                ) : (
                  <span>
                    Total: Rs. {selectedQuote.totalPrice.toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="userName" className="text-zinc-300">
                Customer Name
              </Label>
              <Input
                id="userName"
                value={formData.userName}
                onChange={(e) =>
                  setFormData({ ...formData, userName: e.target.value })
                }
                className="bg-zinc-900 border-zinc-700 text-white"
                placeholder="Full name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="userEmail" className="text-zinc-300">
                Email
              </Label>
              <Input
                id="userEmail"
                type="email"
                value={formData.userEmail}
                onChange={(e) =>
                  setFormData({ ...formData, userEmail: e.target.value })
                }
                className="bg-zinc-900 border-zinc-700 text-white"
                placeholder="email@example.com"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="userPhone" className="text-zinc-300">
                Phone
              </Label>
              <Input
                id="userPhone"
                type="tel"
                value={formData.userPhone}
                onChange={(e) =>
                  setFormData({ ...formData, userPhone: e.target.value })
                }
                className="bg-zinc-900 border-zinc-700 text-white"
                placeholder="+92 300 1234567"
              />
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
              disabled={isSubmitting || !selectedQuote}
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
