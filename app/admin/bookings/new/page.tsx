"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { Alert, App, Button, DatePicker, Form, Input, Select } from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";

import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminPageLoader } from "@/components/admin/loaders";
import { AdminAvailableSlotGrid } from "@/components/admin/AdminAvailableSlotGrid";
import { useBusinessTime } from "@/components/booking/hooks/useBusinessTime";
import { formatAdminBookingEndLabel } from "@/lib/admin-booking-slots";
import { formatLocalDate, formatTime12 } from "@/lib/utils";
import type { AvailableStartTimeQuote } from "@/app/actions/bookings";
import {
  getQueryLoadingState,
  useAvailableStartTimes,
  useCourtsByType,
} from "@/lib/tanstack/hooks/queries";
import { useCreateBookingMutation } from "@/lib/tanstack/hooks/mutations";
import { COMPLEX_OPENING_DATE, type CourtType } from "@/types";

const COURT_TYPES: CourtType[] = ["PADEL", "CRICKET", "PICKLEBALL", "FUTSAL"];

type BookingFormValues = {
  courtType: CourtType;
  userName: string;
  userEmail: string;
  userPhone: string;
};

function dateKeyToLocalDate(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function dateToDayjs(date: Date): Dayjs {
  return dayjs(date);
}

export default function AdminNewBookingPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { message } = App.useApp();
  const [form] = Form.useForm<BookingFormValues>();
  const { todayBusinessKey } = useBusinessTime(COMPLEX_OPENING_DATE);

  const minPickDate = COMPLEX_OPENING_DATE;

  const userRole = (session?.user as { role?: string })?.role;
  const isAdmin = userRole === "admin" || userRole === "super_admin";

  const courtType = Form.useWatch("courtType", form) ?? "PADEL";

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  useEffect(() => {
    if (!selectedDate && todayBusinessKey) {
      const today = dateKeyToLocalDate(todayBusinessKey);
      setSelectedDate(today >= minPickDate ? today : minPickDate);
    }
  }, [selectedDate, todayBusinessKey, minPickDate]);

  const dateStr = selectedDate ? formatLocalDate(selectedDate) : "";

  useEffect(() => {
    if (session && !isAdmin) {
      router.push("/admin/bookings");
    }
  }, [session, isAdmin, router]);

  const [durationHours, setDurationHours] = useState(1);
  const [selectedQuote, setSelectedQuote] =
    useState<AvailableStartTimeQuote | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    data: courts = [],
    isLoading: isLoadingCourtsQuery,
    isFetching: isFetchingCourts,
  } = useCourtsByType(courtType, {
    enabled: !!session && isAdmin,
  });

  const courtsLoading = getQueryLoadingState({
    isLoading: isLoadingCourtsQuery,
    isFetching: isFetchingCourts,
  });

  const availabilityInput =
    courtType && dateStr
      ? {
          courtType,
          date: dateStr,
          duration: durationHours,
        }
      : null;

  const {
    data: quotableQuotes = [],
    isLoading: isLoadingQuotesQuery,
    isFetching: isFetchingQuotes,
    error: quotesError,
  } = useAvailableStartTimes(availabilityInput, {
    enabled: !!session && isAdmin,
  });

  const quotesLoading = getQueryLoadingState({
    isLoading: isLoadingQuotesQuery,
    isFetching: isFetchingQuotes,
  });

  const isInitialSlotLoading =
    courtsLoading.isInitialLoading ||
    (availabilityInput != null && quotesLoading.isInitialLoading);

  const createBookingMutation = useCreateBookingMutation();

  const durationPresets = useMemo(() => {
    if (courtType === "FUTSAL") {
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
  }, [courtType]);

  useEffect(() => {
    const first = durationPresets[0]?.hours ?? 1;
    setDurationHours((prev) => (prev === first ? prev : first));
  }, [courtType, durationPresets]);

  useEffect(() => {
    setSelectedQuote(null);
    setErrorMessage(null);
  }, [courtType, durationHours, dateStr]);

  useEffect(() => {
    if (!quotesError) return;
    setErrorMessage(
      quotesError instanceof Error
        ? quotesError.message
        : "Failed to load slots.",
    );
  }, [quotesError]);

  const handleSubmit = async (values: BookingFormValues) => {
    setErrorMessage(null);

    if (!selectedQuote) {
      setErrorMessage("Please select a start time");
      return;
    }

    try {
      const result = await createBookingMutation.mutateAsync({
        courtType: values.courtType,
        date: dateStr,
        startTime: selectedQuote.startTime,
        duration: durationHours,
        userName: values.userName.trim(),
        userEmail: values.userEmail.trim(),
        userPhone: values.userPhone.trim(),
      });

      if (!result.success || !result.booking) {
        throw new Error(result.error || "Failed to create booking");
      }

      message.success("Booking created successfully");
      const raw = result.booking as { _id?: string; id?: string };
      const id = raw._id ?? raw.id;
      router.push(`/admin/bookings/${id ?? ""}`);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to create booking",
      );
    }
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <AdminLayout
      title="Create Booking"
      description="Pick date, duration, and an available start time. Court is assigned automatically."
      isLoading={courtsLoading.isRefreshing || quotesLoading.isRefreshing}
    >
      <div className="space-y-8 p-6">
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => router.push("/admin/bookings")}
          className="mb-6"
        >
          Back to Bookings
        </Button>

        {errorMessage && (
          <Alert
            type="error"
            message={errorMessage}
            showIcon
            closable
            onClose={() => setErrorMessage(null)}
          />
        )}

        <Form<BookingFormValues>
          form={form}
          layout="vertical"
          requiredMark={false}
          initialValues={{
            courtType: "PADEL",
            userName: "",
            userEmail: "",
            userPhone: "",
          }}
          onFinish={handleSubmit}
          className="space-y-6"
        >
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Form.Item
              label="Court Type"
              name="courtType"
              rules={[{ required: true, message: "Please select a court type" }]}
            >
              <Select
                options={COURT_TYPES.map((type) => ({
                  value: type,
                  label: type,
                }))}
              />
            </Form.Item>

            <Form.Item label="Date" required>
              <DatePicker
                value={selectedDate ? dateToDayjs(selectedDate) : undefined}
                onChange={(date) => {
                  if (date) setSelectedDate(date.toDate());
                }}
                className="w-full"
                disabledDate={(current) => {
                  if (!current) return false;
                  const min = dayjs(minPickDate).startOf("day");
                  return current.startOf("day").isBefore(min);
                }}
              />
            </Form.Item>

            <div className="md:col-span-2">
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
                          : "border-[var(--ant-color-border)] bg-[var(--ant-color-bg-elevated)] text-[var(--ant-color-text)] hover:border-[var(--ant-color-primary)]"
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </Form.Item>
            </div>
          </div>

          {courtType && dateStr && (
            <div className="space-y-3">
              <p className="text-sm text-[var(--ant-color-text-secondary)]">
                Available start times (includes past dates and times)
              </p>
              {isInitialSlotLoading ? (
                <AdminPageLoader label="Loading available slots..." />
              ) : (
                <AdminAvailableSlotGrid
                  quotes={quotableQuotes}
                  selectedQuote={selectedQuote}
                  durationHours={durationHours}
                  courts={courts}
                  onSelect={(q) => setSelectedQuote(q)}
                  isLoading={quotesLoading.isRefreshing}
                  emptyMessage="No available slots for this date and duration."
                  formatTime12={formatTime12}
                  formatEndLabel={(start, dur) =>
                    formatAdminBookingEndLabel(start, dur)
                  }
                />
              )}
            </div>
          )}

          {selectedQuote && (
            <div className="space-y-2 rounded-lg border border-[var(--ant-color-border)] bg-[var(--ant-color-bg-elevated)] p-4 text-sm text-[var(--ant-color-text-secondary)]">
              <p className="font-medium text-[var(--ant-color-text)]">Price preview</p>
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

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Form.Item
              label="Customer Name"
              name="userName"
              rules={[{ required: true, message: "Please enter the customer name" }]}
            >
              <Input placeholder="Full name" />
            </Form.Item>

            <Form.Item
              label="Email"
              name="userEmail"
              rules={[
                { required: true, message: "Please enter the customer email" },
                { type: "email", message: "Please enter a valid email address" },
              ]}
            >
              <Input type="email" placeholder="email@example.com" />
            </Form.Item>

            <Form.Item
              label="Phone"
              name="userPhone"
              className="md:col-span-2"
              rules={[{ required: true, message: "Please enter the customer phone" }]}
            >
              <Input type="tel" placeholder="+92 300 1234567" />
            </Form.Item>
          </div>

          <div className="flex items-center justify-end gap-4 border-t border-[var(--ant-color-border)] pt-4">
            <Button type="text" onClick={() => router.push("/admin/bookings")}>
              Cancel
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={createBookingMutation.isPending}
              disabled={!selectedQuote}
            >
              Create Booking
            </Button>
          </div>
        </Form>
      </div>
    </AdminLayout>
  );
}
