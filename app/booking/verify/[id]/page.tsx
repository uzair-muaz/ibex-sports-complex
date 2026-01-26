"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Loader2, CheckCircle, XCircle, User, Mail, Phone, Calendar, Clock, MapPin, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import api from "@/lib/api";
import type { Booking, Court } from "@/types";

export default function VerifyBookingPage() {
  const params = useParams();
  const bookingId = params.id as string;
  
  const [booking, setBooking] = useState<Booking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (bookingId) {
      loadBooking();
    }
  }, [bookingId]);

  const loadBooking = async () => {
    try {
      setIsLoading(true);
      setError("");

      if (!bookingId || bookingId.length !== 24 || !/^[0-9a-fA-F]{24}$/.test(bookingId)) {
        setError("Invalid booking ID. Please check the QR code.");
        setIsLoading(false);
        return;
      }

      const response = await api.get(`/api/bookings/${bookingId}`);
      if (response.data?.success && response.data.booking) {
        setBooking(response.data.booking);
      } else {
        setError(response.data?.error || "Booking not found. Please check the QR code.");
      }
    } catch (error: any) {
      console.error('Failed to load booking:', error);
      setError(error.response?.data?.error || error.message || "Failed to load booking information.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-[#2DD4BF] mx-auto mb-4" />
          <p className="text-zinc-400">Loading booking details...</p>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <Card className="w-full max-w-md border-zinc-800 bg-zinc-950">
          <CardContent className="pt-6">
            <div className="text-center">
              <XCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">Booking Not Found</h2>
              <p className="text-zinc-400">{error || "The booking could not be found."}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const courtName =
    typeof booking.courtId === "object" &&
    booking.courtId &&
    "name" in booking.courtId
      ? (booking.courtId as Court).name || "Unknown Court"
      : "Unknown Court";

  const courtType =
    typeof booking.courtId === "object" &&
    booking.courtId &&
    "type" in booking.courtId
      ? (booking.courtId as Court).type || "Unknown"
      : "Unknown";

  const startHour = Math.floor(booking.startTime);
  const startMin = booking.startTime % 1 === 0 ? "00" : "30";
  const endTime = booking.startTime + booking.duration;
  const endHour = Math.floor(endTime);
  const endMin = endTime % 1 === 0 ? "00" : "30";

  return (
    <div className="min-h-screen bg-black py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <CheckCircle className="h-16 w-16 text-[#2DD4BF] mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-white mb-2">Entry Verification</h1>
          <p className="text-zinc-400">Booking Details</p>
        </div>

        {/* Booking Card */}
        <Card className="border-zinc-800 bg-zinc-950">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white">Booking Information</CardTitle>
              <Badge
                variant="outline"
                className={
                  booking.status === "confirmed"
                    ? "bg-[#2DD4BF]/20 border-[#2DD4BF]/50 text-[#2DD4BF]"
                    : booking.status === "pending_payment"
                      ? "bg-yellow-500/20 border-yellow-500/50 text-yellow-400"
                    : booking.status === "cancelled"
                      ? "bg-red-500/20 border-red-500/50 text-red-400"
                      : booking.status === "completed"
                        ? "bg-green-500/20 border-green-500/50 text-green-400"
                        : "bg-zinc-800 border-zinc-700 text-zinc-300"
                }
              >
                {booking.status === "pending_payment"
                  ? "Pending Payment"
                  : booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* User Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white border-b border-zinc-800 pb-2">
                Customer Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <User className="h-5 w-5 text-[#2DD4BF] mt-0.5" />
                  <div>
                    <p className="text-xs text-zinc-400 mb-1">Name</p>
                    <p className="text-white font-medium">{booking.userName}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-[#2DD4BF] mt-0.5" />
                  <div>
                    <p className="text-xs text-zinc-400 mb-1">Email</p>
                    <p className="text-white font-medium text-sm break-all">{booking.userEmail}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-[#2DD4BF] mt-0.5" />
                  <div>
                    <p className="text-xs text-zinc-400 mb-1">Phone</p>
                    <p className="text-white font-medium">{booking.userPhone || "N/A"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <DollarSign className="h-5 w-5 text-[#2DD4BF] mt-0.5" />
                  <div>
                    <p className="text-xs text-zinc-400 mb-1">Amount Paid</p>
                    <p className="text-white font-medium">PKR {(booking.amountPaid || 0).toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Booking Details */}
            <div className="space-y-4 pt-4 border-t border-zinc-800">
              <h3 className="text-lg font-semibold text-white border-b border-zinc-800 pb-2">
                Booking Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-[#2DD4BF] mt-0.5" />
                  <div>
                    <p className="text-xs text-zinc-400 mb-1">Court</p>
                    <p className="text-white font-medium">{courtName}</p>
                    <p className="text-zinc-400 text-xs mt-1">{courtType}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-[#2DD4BF] mt-0.5" />
                  <div>
                    <p className="text-xs text-zinc-400 mb-1">Date</p>
                    <p className="text-white font-medium">
                      {new Date(booking.date).toLocaleDateString("en-US", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-[#2DD4BF] mt-0.5" />
                  <div>
                    <p className="text-xs text-zinc-400 mb-1">Time</p>
                    <p className="text-white font-medium">
                      {startHour.toString().padStart(2, "0")}:{startMin} - {endHour.toString().padStart(2, "0")}:{endMin}
                    </p>
                    <p className="text-zinc-400 text-xs mt-1">{booking.duration} hour{booking.duration !== 1 ? "s" : ""}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <DollarSign className="h-5 w-5 text-[#2DD4BF] mt-0.5" />
                  <div>
                    <p className="text-xs text-zinc-400 mb-1">Total Price</p>
                    <p className="text-[#2DD4BF] font-semibold">PKR {booking.totalPrice.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Booking ID */}
            <div className="pt-4 border-t border-zinc-800">
              <p className="text-xs text-zinc-400 mb-1">Booking ID</p>
              <p className="text-zinc-500 font-mono text-sm">#{booking._id.slice(-8)}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
