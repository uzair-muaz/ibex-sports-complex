"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeftOutlined } from "@ant-design/icons";
import {
  Alert,
  App,
  Button,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Select,
  Typography,
} from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminPageLoader } from "@/components/admin/loaders";
import { AdminAvailableSlotGrid } from "@/components/admin/AdminAvailableSlotGrid";
import { useBusinessTime } from "@/components/booking/hooks/useBusinessTime";
import type { AvailableStartTimeQuote } from "@/app/actions/bookings";
import {
  getQueryLoadingState,
  useAllBookings,
  useAvailableStartTimes,
  useCourtsByType,
} from "@/lib/tanstack/hooks/queries";
import { useUpdateBookingMutation } from "@/lib/tanstack/hooks/mutations";
import { COMPLEX_OPENING_DATE } from "@/types";
import type { Court, Booking } from "@/types";
import { formatLocalDate, formatTime12 } from "@/lib/utils";
import { formatAdminBookingEndLabel } from "@/lib/admin-booking-slots";
import { PriceBreakdown } from "@/components/PriceBreakdown";

const { Title, Text } = Typography;

type BookingStatus =
  | "pending_payment"
  | "confirmed"
  | "cancelled"
  | "completed";

type EditFormValues = {
  date: Dayjs;
  status: BookingStatus;
  userName: string;
  userEmail: string;
  userPhone: string;
  amountReceivedOnline: number;
  amountReceivedCash: number;
};

function dateKeyToLocalDate(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export default function EditBookingPage() {
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
    data: allBookings = [],
    isLoading: isLoadingBookingsQuery,
    isFetching: isFetchingBookings,
    isError: isBookingsError,
  } = useAllBookings({
    enabled: !!session && isAdmin && !!bookingId,
  });

  const bookingsLoading = getQueryLoadingState({
    isLoading: isLoadingBookingsQuery,
    isFetching: isFetchingBookings,
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

  const durationPresets = useMemo(() => {
    let presets: { hours: number; label: string }[];
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
    if (!isBookingsError) return;
    message.error("Failed to load booking");
    router.push("/admin/bookings");
  }, [isBookingsError, message, router]);

  useEffect(() => {
    if (
      !session ||
      !isAdmin ||
      !bookingId ||
      loadedBooking ||
      bookingsLoading.isInitialLoading
    ) {
      return;
    }

    const booking = allBookings.find((b: Booking) => b._id === bookingId);
    if (booking) {
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
    } else {
      message.error("Booking not found");
      router.push("/admin/bookings");
    }
  }, [
    session,
    isAdmin,
    bookingId,
    allBookings,
    loadedBooking,
    bookingsLoading.isInitialLoading,
    form,
    message,
    router,
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
      message.error(error instanceof Error ? error.message : "An error occurred");
    }
  };

  const amountReceivedOnline = Form.useWatch("amountReceivedOnline", form) ?? 0;
  const amountReceivedCash = Form.useWatch("amountReceivedCash", form) ?? 0;
  const formStatus = Form.useWatch("status", form);
  const paymentTotal = amountReceivedOnline + amountReceivedCash;

  if (!isAdmin) {
    return null;
  }

  if (bookingsLoading.isInitialLoading) {
    return (
      <AdminLayout title="Edit Booking" description="Loading booking...">
        <AdminPageLoader label="Loading booking..." />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title="Edit Booking"
      description="Update booking details"
      isLoading={
        bookingsLoading.isRefreshing ||
        courtsLoading.isRefreshing ||
        quotesLoading.isRefreshing
      }
    >
      <div className="space-y-6 p-6">
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => router.push("/admin/bookings")}
          className="mb-4"
        >
          Back to Bookings
        </Button>

        <Form<EditFormValues>
          form={form}
          layout="vertical"
          requiredMark={false}
          onFinish={handleSubmit}
          className="space-y-6"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Form.Item
              label="Date"
              name="date"
              rules={[{ required: true, message: "Please select a date" }]}
            >
              <DatePicker
                className="w-full"
                onChange={() => {
                  userChangedSlotRef.current = false;
                }}
                disabledDate={(current) => {
                  if (!current) return false;
                  const min = dayjs(minPickDate).startOf("day");
                  return current.startOf("day").isBefore(min);
                }}
              />
            </Form.Item>

            <Form.Item
              label="Status"
              name="status"
              rules={[{ required: true, message: "Please select a status" }]}
            >
              <Select
                options={[
                  { value: "pending_payment", label: "Pending Payment" },
                  { value: "confirmed", label: "Confirmed" },
                  { value: "cancelled", label: "Cancelled" },
                  { value: "completed", label: "Completed" },
                ]}
              />
            </Form.Item>
          </div>

          <div className="space-y-4">
            <Form.Item label="Duration" required className="mb-0">
              <div className="flex flex-wrap gap-2">
                {durationPresets.map((preset) => (
                  <button
                    key={preset.hours}
                    type="button"
                    onClick={() => setDurationHours(preset.hours)}
                    className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                      durationHours === preset.hours
                        ? "border-teal-400 bg-teal-500/20 text-teal-200"
                        : "border-zinc-700 bg-zinc-900/60 text-zinc-200 hover:border-zinc-500"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </Form.Item>

            <div>
              <Text className="text-sm text-zinc-200">
                Available start times
                <span className="ml-2 font-normal text-zinc-500">
                  (court assigned automatically; past times today hidden unless
                  this booking)
                </span>
              </Text>
            </div>

            {isInitialSlotLoading ? (
              <AdminPageLoader label="Loading available slots..." />
            ) : courts.length === 0 ? (
              <p className="py-8 text-center text-sm text-zinc-400">
                No courts available for this court type.
              </p>
            ) : (
              <AdminAvailableSlotGrid
                quotes={quotableQuotes}
                selectedQuote={selectedQuote}
                durationHours={durationHours}
                courts={courts}
                onSelect={(q) => {
                  userChangedSlotRef.current = true;
                  setSelectedQuote(q);
                }}
                isLoading={quotesLoading.isRefreshing}
                emptyMessage="No available slots for this date and duration."
                formatTime12={formatTime12}
                formatEndLabel={(start, dur) =>
                  formatAdminBookingEndLabel(start, dur)
                }
              />
            )}

            {selectedQuote && selectedQuote.totalPrice > 0 && (
              <div className="mt-4 space-y-3 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
                <p className="text-sm text-zinc-400">
                  Pricing for the selected slot (saved on update if time or date
                  changed).
                </p>
                <PriceBreakdown
                  originalPrice={selectedQuote.originalPrice}
                  totalPrice={selectedQuote.totalPrice}
                  discounts={selectedQuote.appliedDiscounts}
                  discountAmount={selectedQuote.discountAmount}
                />
                {savedBookingPricing ? (
                  <p className="border-t border-zinc-800 pt-1 text-xs text-zinc-500">
                    Currently saved on booking: PKR{" "}
                    {savedBookingPricing.totalPrice.toLocaleString()}
                    {selectedQuote.totalPrice !==
                    savedBookingPricing.totalPrice ? (
                      <span className="text-amber-500/90">
                        {" "}
                        — will update after you save if the slot or discounts
                        changed.
                      </span>
                    ) : null}
                  </p>
                ) : null}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <Title level={5} className="mb-0! text-white!">
              User Details
            </Title>

            <Form.Item
              label="User Name"
              name="userName"
              rules={[{ required: true, message: "Please enter the user name" }]}
            >
              <Input />
            </Form.Item>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Form.Item
                label="Email"
                name="userEmail"
                rules={[
                  { required: true, message: "Please enter the email" },
                  { type: "email", message: "Please enter a valid email address" },
                ]}
              >
                <Input type="email" />
              </Form.Item>

              <Form.Item
                label={
                  <>
                    Phone <span className="text-red-400">*</span>
                  </>
                }
                name="userPhone"
                rules={[{ required: true, message: "Please enter the phone number" }]}
              >
                <Input type="tel" placeholder="+92 300 1234567" />
              </Form.Item>
            </div>
          </div>

          <div className="space-y-4">
            <Title level={5} className="mb-0! text-white!">
              Payment Details
            </Title>

            <Form.Item label="Payment received" className="mb-0">
              <div className="grid grid-cols-1 gap-4 rounded-lg border border-zinc-800 bg-zinc-900/30 p-4 sm:grid-cols-2">
                <Form.Item
                  label="Received online (PKR)"
                  name="amountReceivedOnline"
                  className="mb-0"
                >
                  <InputNumber
                    min={0}
                    step={1}
                    className="w-full"
                    placeholder="0"
                    onChange={handlePaymentChange}
                  />
                </Form.Item>

                <Form.Item
                  label="Received in cash (PKR)"
                  name="amountReceivedCash"
                  className="mb-0"
                >
                  <InputNumber
                    min={0}
                    step={1}
                    className="w-full"
                    placeholder="0"
                    onChange={handlePaymentChange}
                  />
                </Form.Item>

                <div className="flex items-center gap-2 border-t border-zinc-800 pt-1 sm:col-span-2">
                  <Text type="secondary" className="text-xs">
                    Account received (total)
                  </Text>
                  <Text className="text-sm font-semibold text-[#2DD4BF]">
                    PKR {paymentTotal.toLocaleString()}
                  </Text>
                </div>
              </div>
            </Form.Item>

            {paymentTotal > 0 && formStatus === "pending_payment" && (
              <Alert
                type="info"
                showIcon
                message='Status will change to "Confirmed" when saved. Set status to "Completed" when payment is fully settled.'
              />
            )}
          </div>

          <div className="flex items-center justify-end gap-4 border-t border-zinc-800 pt-4">
            <Button type="text" onClick={() => router.push("/admin/bookings")}>
              Cancel
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={updateBookingMutation.isPending}
              disabled={!selectedQuote}
            >
              Update Booking
            </Button>
          </div>
        </Form>
      </div>
    </AdminLayout>
  );
}
