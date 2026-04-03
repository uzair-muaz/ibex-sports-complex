import type { Metadata } from "next";
import BookingClient from "@/components/booking/BookingPageClient";
import { metadata as bookingMetadata } from "@/app/booking/metadata";

export const metadata: Metadata = bookingMetadata;

export default function BookingPage() {
  return <BookingClient />;
}
