"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { App, Form } from "antd";
import dayjs from "dayjs";
import { useSession } from "next-auth/react";
import { useParams, useRouter } from "next/navigation";
import type { AvailableStartTimeQuote } from "@/app/actions/bookings";
import { useBusinessTime } from "@/components/booking/hooks/useBusinessTime";
import { useUpdateBookingMutation } from "@/lib/tanstack/hooks/mutations";
import {
  getQueryLoadingState,
  useAdminBooking,
  useAvailableStartTimes,
  useCourtsByType,
} from "@/lib/tanstack/hooks/queries";
import { formatLocalDate } from "@/lib/utils";
import { COMPLEX_OPENING_DATE } from "@/types";
import type { Booking, Court } from "@/types";
import type { DurationPreset, EditFormValues } from "./types";

function dateKeyToLocalDate(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function useEditBookingPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const params = useParams();
  const bookingId = params.id as string;
  const { message } = App.useApp();
  const [form] = Form.useForm<EditFormValues>();

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

  const [courtType, setCourtType] = useState<
    "PADEL" | "CRICKET" | "PICKLEBALL" | "FUTSAL"
  >("PADEL");
  const [durationHours, setDurationHours] = useState(1);

  const selectedDate = Form.useWatch("date", form);

  const userRole = (session?.user as { role?: string })?.role;
  const isAdmin = userRole === "admin" || userRole === "super_admin";

  const {
    data: booking,
    isLoading: isLoadingBookingQuery,
    isFetching: isFetchingBooking,
    isError: isBookingError,
  } = useAdminBooking(bookingId, {
    enabled: !!session && isAdmin && !!bookingId,
  });

  const bookingsLoading = getQueryLoadingState({
    isLoading: isLoadingBookingQuery,
    isFetching: isFetchingBooking,
  });

  const {
    data: courts = [],
    isLoading: isLoadingCourtsQuery,
    isFetching: isFetchingCourts,
  } = useCourtsByType(courtType, {
    enabled: !!session && isAdmin && !!courtType,
  });

  const courtsLoading = getQueryLoadingState({
    isLoading: isLoadingCourtsQuery,
    isFetching: isFetchingCourts,
  });

  const dateString = selectedDate
    ? formatLocalDate(selectedDate.toDate())
    : "";

  const availabilityInput =
    loadedBooking && courtType && dateString
      ? {
          courtType,
          date: dateString,
          duration: durationHours,
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

  const quotesLoading = getQueryLoadingState({
    isLoading: isLoadingQuotesQuery,
    isFetching: isFetchingQuotes,
  });

  const isInitialSlotLoading =
    courtsLoading.isInitialLoading ||
    (availabilityInput != null && quotesLoading.isInitialLoading);

  const quotableQuotes = useMemo(() => {
    if (!loadedBooking) return [];
    let list = rawQuotes;
    if (dateString === todayBusinessKey) {
      const sameOriginalSlot = (q: AvailableStartTimeQuote) =>
        loadedBooking.date === dateString &&
        q.startTime === loadedBooking.startTime &&
        durationHours === Number(loadedBooking.duration);
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
    durationHours,
    nowBusinessHourDecimal,
  ]);

  const updateBookingMutation = useUpdateBookingMutation();

  const durationPresets = useMemo((): DurationPreset[] => {
    let presets: DurationPreset[];
    if (courtType === "FUTSAL") {
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
  }, [courtType, loadedBooking]);

  useEffect(() => {
    if (session && !isAdmin) {
      router.push("/admin/bookings");
    }
  }, [session, isAdmin, router]);

  useEffect(() => {
    if (!isBookingError) return;
    message.error("Failed to load booking");
    router.push("/admin/bookings");
  }, [isBookingError, message, router]);

  useEffect(() => {
    if (
      !session ||
      !isAdmin ||
      !bookingId ||
      loadedBooking ||
      bookingsLoading.isInitialLoading ||
      !booking
    ) {
      return;
    }

    userChangedSlotRef.current = false;
    setLoadedBooking(booking);
    setSavedBookingPricing({
      totalPrice: Number(booking.totalPrice) || 0,
      originalPrice: booking.originalPrice,
      discountAmount: booking.discountAmount,
    });
    const resolvedCourtType =
      typeof booking.courtId === "object" &&
      booking.courtId &&
      "type" in booking.courtId
        ? (booking.courtId as Court).type
        : "PADEL";

    setCourtType(
      resolvedCourtType as "PADEL" | "CRICKET" | "PICKLEBALL" | "FUTSAL",
    );

    const hasNewPaymentFields =
      booking.amountReceivedOnline != null ||
      booking.amountReceivedCash != null;
    const dur = Number(booking.duration);
    setDurationHours(dur);

    form.setFieldsValue({
      date: dayjs(booking.date + "T12:00:00"),
      status: booking.status,
      userName: booking.userName,
      userEmail: booking.userEmail,
      userPhone: booking.userPhone || "",
      amountReceivedOnline: hasNewPaymentFields
        ? (booking.amountReceivedOnline ?? 0)
        : 0,
      amountReceivedCash: hasNewPaymentFields
        ? (booking.amountReceivedCash ?? 0)
        : booking.amountPaid || 0,
    });
  }, [
    session,
    isAdmin,
    bookingId,
    booking,
    loadedBooking,
    bookingsLoading.isInitialLoading,
    form,
  ]);

  useEffect(() => {
    setSelectedQuote(null);
  }, [selectedDate, courtType, durationHours]);

  useEffect(() => {
    if (userChangedSlotRef.current) return;
    if (!loadedBooking || quotesLoading.isLoading || quotableQuotes.length === 0)
      return;
    if (!selectedDate) return;
    if (dateString !== loadedBooking.date) return;
    if (durationHours !== Number(loadedBooking.duration)) return;
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
    quotesLoading.isLoading,
    selectedDate,
    dateString,
    durationHours,
  ]);

  const handlePaymentChange = () => {
    const online = form.getFieldValue("amountReceivedOnline") ?? 0;
    const cash = form.getFieldValue("amountReceivedCash") ?? 0;
    const total = online + cash;
    const status = form.getFieldValue("status");
    if (total > 0 && status === "pending_payment") {
      form.setFieldValue("status", "confirmed");
    }
  };

  const handleSubmit = async (values: EditFormValues) => {
    if (!selectedQuote) {
      message.error("Please select a start time");
      return;
    }

    try {
      const submitDateString = formatLocalDate(values.date.toDate());

      const result = await updateBookingMutation.mutateAsync({
        bookingId,
        courtId: selectedQuote.assignedCourtId,
        date: submitDateString,
        startTime: selectedQuote.startTime,
        duration: durationHours,
        userName: values.userName,
        userEmail: values.userEmail,
        userPhone: values.userPhone,
        status: values.status,
        amountReceivedOnline: values.amountReceivedOnline,
        amountReceivedCash: values.amountReceivedCash,
      });

      if (result.success) {
        router.replace("/admin/bookings");
      } else {
        message.error(result.error || "Failed to update booking");
      }
    } catch (error: unknown) {
      message.error(
        error instanceof Error ? error.message : "An error occurred",
      );
    }
  };

  const amountReceivedOnline = Form.useWatch("amountReceivedOnline", form) ?? 0;
  const amountReceivedCash = Form.useWatch("amountReceivedCash", form) ?? 0;
  const formStatus = Form.useWatch("status", form);
  const paymentTotal = amountReceivedOnline + amountReceivedCash;

  const goToBookings = () => router.push("/admin/bookings");

  return {
    isAdmin,
    form,
    minPickDate,
    bookingsLoading,
    courtsLoading,
    quotesLoading,
    isInitialSlotLoading,
    courts,
    quotableQuotes,
    selectedQuote,
    durationPresets,
    durationHours,
    setDurationHours,
    savedBookingPricing,
    paymentTotal,
    formStatus,
    submitLoading: updateBookingMutation.isPending,
    goToBookings,
    handlePaymentChange,
    handleSubmit,
    onDateUserChange: () => {
      userChangedSlotRef.current = false;
    },
    onSelectQuote: (q: AvailableStartTimeQuote) => {
      userChangedSlotRef.current = true;
      setSelectedQuote(q);
    },
  };
}
