"use client";

import { ArrowLeftOutlined } from "@ant-design/icons";
import { Button } from "antd";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminPageLoader } from "@/components/admin/loaders";
import { EditBookingForm } from "@/components/admin/bookings/edit/EditBookingForm";
import { useEditBookingPage } from "@/components/admin/bookings/edit/useEditBookingPage";

export default function EditBookingPage() {
  const {
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
    submitLoading,
    goToBookings,
    handlePaymentChange,
    handleSubmit,
    onDateUserChange,
    onSelectQuote,
  } = useEditBookingPage();

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
          onClick={goToBookings}
          className="mb-4"
        >
          Back to Bookings
        </Button>

        <EditBookingForm
          form={form}
          minPickDate={minPickDate}
          onDateUserChange={onDateUserChange}
          durationPresets={durationPresets}
          durationHours={durationHours}
          onDurationChange={setDurationHours}
          isInitialSlotLoading={isInitialSlotLoading}
          courts={courts}
          quotableQuotes={quotableQuotes}
          selectedQuote={selectedQuote}
          quotesRefreshing={quotesLoading.isRefreshing}
          savedBookingPricing={savedBookingPricing}
          onSelectQuote={onSelectQuote}
          onPaymentChange={handlePaymentChange}
          paymentTotal={paymentTotal}
          formStatus={formStatus}
          submitLoading={submitLoading}
          onCancel={goToBookings}
          onFinish={handleSubmit}
        />
      </div>
    </AdminLayout>
  );
}
