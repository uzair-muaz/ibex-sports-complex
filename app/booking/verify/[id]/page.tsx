"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Loader2, CheckCircle, X, User, Mail, Phone, Calendar, Clock, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getAllBookings } from "@/app/actions/bookings";
import type { Booking, Court, AppliedDiscount } from "@/types";

export default function VerifyBookingPage() {
  const params = useParams();
  const bookingId = params.id as string;
  const [booking, setBooking] = useState<Booking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBooking();
  }, [bookingId]);

  const loadBooking = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await getAllBookings();
      if (result.success) {
        const foundBooking = result.bookings.find((b: Booking) => b._id === bookingId);
        if (foundBooking) {
          setBooking(foundBooking);
        } else {
          setError("Booking not found");
        }
      } else {
        setError("Failed to load booking");
      }
    } catch (err) {
      setError("An error occurred while loading the booking");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-[#2DD4BF]" />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
        <Card className="bg-zinc-950 border-zinc-800 max-w-md w-full">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <X className="w-16 h-16 text-red-400" />
              <h2 className="text-2xl font-bold text-white">Booking Not Found</h2>
              <p className="text-zinc-400">{error || "The booking you're looking for doesn't exist."}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const court = typeof booking.courtId === "object" && booking.courtId && "name" in booking.courtId
    ? (booking.courtId as Court)
    : null;

  const startTimeFormatted = `${Math.floor(booking.startTime).toString().padStart(2, "0")}:${booking.startTime % 1 === 0 ? "00" : "30"}`;
  const rawEndTime = booking.startTime + booking.duration;
  const endTime = ((rawEndTime % 24) + 24) % 24;
  const endTimeFormatted = `${Math.floor(endTime).toString().padStart(2, "0")}:${endTime % 1 === 0 ? "00" : "30"}`;

  return (
    <div className="min-h-screen bg-black text-white py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold text-white">Entry Verification</h1>
          <p className="text-zinc-400">Booking Details</p>
        </div>

        {/* Booking Status Card */}
        <Card className="bg-zinc-950 border-zinc-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white">Booking Status</CardTitle>
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
                  : booking.status.charAt(0).toUpperCase() + booking.status.slice(1).replace(/_/g, " ")}
              </Badge>
            </div>
          </CardHeader>
        </Card>

        {/* User Details Card */}
        <Card className="bg-zinc-950 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <User className="w-5 h-5 text-[#2DD4BF]" />
              Customer Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-zinc-400 mt-0.5" />
                <div>
                  <p className="text-xs text-zinc-400 mb-1">Full Name</p>
                  <p className="text-white font-semibold">{booking.userName}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-zinc-400 mt-0.5" />
                <div>
                  <p className="text-xs text-zinc-400 mb-1">Email Address</p>
                  <p className="text-white font-semibold break-all">{booking.userEmail}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-zinc-400 mt-0.5" />
                <div>
                  <p className="text-xs text-zinc-400 mb-1">Phone Number</p>
                  <p className="text-white font-semibold">{booking.userPhone || "N/A"}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-zinc-400 mt-0.5" />
                <div>
                  <p className="text-xs text-zinc-400 mb-1">Court</p>
                  <p className="text-white font-semibold">{court?.name || "Unknown Court"}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Booking Details Card */}
        <Card className="bg-zinc-950 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#2DD4BF]" />
              Booking Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-zinc-400 mt-0.5" />
                <div>
                  <p className="text-xs text-zinc-400 mb-1">Date</p>
                  <p className="text-white font-semibold">
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
                <Clock className="w-5 h-5 text-zinc-400 mt-0.5" />
                <div>
                  <p className="text-xs text-zinc-400 mb-1">Time Slot</p>
                  <p className="text-white font-semibold">
                    {startTimeFormatted} - {endTimeFormatted}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-zinc-400 mt-0.5" />
                <div>
                  <p className="text-xs text-zinc-400 mb-1">Duration</p>
                  <p className="text-white font-semibold">
                    {booking.duration} hour{booking.duration !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Price Breakdown */}
            <div className="pt-4 border-t border-zinc-800 space-y-2">
              {booking.discountAmount && booking.discountAmount > 0 ? (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-zinc-400">Subtotal</p>
                    <p className="text-zinc-300">PKR {(booking.originalPrice || booking.totalPrice + booking.discountAmount).toLocaleString()}</p>
                  </div>
                  {booking.discounts?.map((d: AppliedDiscount, idx: number) => (
                    <div key={idx} className="flex items-center justify-between">
                      <p className="text-xs text-green-400">
                        {d.name} ({d.type === 'percentage' ? `${d.value}%` : `PKR ${d.value}`})
                      </p>
                      <p className="text-green-400">-PKR {d.amountSaved.toLocaleString()}</p>
                    </div>
                  ))}
                  <div className="flex items-center justify-between pt-2 border-t border-zinc-700">
                    <p className="text-sm text-white font-semibold">Total</p>
                    <p className="text-[#2DD4BF] font-bold text-lg">PKR {booking.totalPrice.toLocaleString()}</p>
                  </div>
                  <div className="bg-green-500/10 border border-green-500/30 rounded-md px-3 py-2 text-center">
                    <span className="text-green-400 text-sm font-medium">
                      You saved PKR {booking.discountAmount.toLocaleString()}!
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-between">
                  <p className="text-xs text-zinc-400">Total Price</p>
                  <p className="text-[#2DD4BF] font-semibold">PKR {booking.totalPrice.toLocaleString()}</p>
                </div>
              )}
            </div>
            
            {/* Payment Status */}
            {(booking.amountPaid || 0) > 0 && (
              <div className="pt-4 border-t border-zinc-800">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-zinc-400">Amount Paid</p>
                  <p className="text-white font-semibold">PKR {(booking.amountPaid || 0).toLocaleString()}</p>
                </div>
                {(booking.amountPaid || 0) < booking.totalPrice && (
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-zinc-400">Remaining Balance</p>
                    <p className="text-yellow-400 font-semibold">
                      PKR {(booking.totalPrice - (booking.amountPaid || 0)).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Verification Status */}
        <Card className="bg-zinc-950 border-zinc-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-center gap-3">
              {booking.status === "confirmed" || booking.status === "completed" ? (
                <>
                  <CheckCircle className="w-6 h-6 text-[#2DD4BF]" />
                  <p className="text-white font-semibold">Entry Verified - Booking Confirmed</p>
                </>
              ) : booking.status === "pending_payment" ? (
                <>
                  <X className="w-6 h-6 text-yellow-400" />
                  <p className="text-yellow-400 font-semibold">Payment Pending - Cannot Verify Entry</p>
                </>
              ) : (
                <>
                  <X className="w-6 h-6 text-red-400" />
                  <p className="text-red-400 font-semibold">Booking {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}</p>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
