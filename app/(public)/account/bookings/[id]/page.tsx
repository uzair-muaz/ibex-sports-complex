"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCancelMyBookingMutation } from "@/lib/tanstack/hooks/mutations";
import { useMyBooking } from "@/lib/tanstack/hooks/queries";
import { Button } from "@/components/ui/button";
import { PriceBreakdown } from "@/components/PriceBreakdown";
import { formatTime12 } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function BookingDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = String(params.id);
  const [cancelOpen, setCancelOpen] = useState(false);
  const bookingQuery = useMyBooking(bookingId);
  const cancelMutation = useCancelMyBookingMutation();

  useEffect(() => {
    if (!bookingQuery.error) return;
    toast.error(
      bookingQuery.error instanceof Error
        ? bookingQuery.error.message
        : "Not found",
    );
    router.replace("/account/bookings");
  }, [bookingQuery.error, router]);

  const onCancel = async () => {
    try {
      await cancelMutation.mutateAsync(bookingId);
      toast.success("Booking cancelled");
      setCancelOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Cancel failed");
    }
  };

  if (bookingQuery.isPending || !bookingQuery.data) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-[#2DD4BF]" />
      </div>
    );
  }

  const b = bookingQuery.data.booking as {
    _id: string;
    date: string;
    startTime: number;
    duration: number;
    status: string;
    originalPrice?: number;
    discounts?: unknown[];
    discountAmount?: number;
    totalPrice: number;
    loyaltyDiscountPkr?: number;
    loyaltyPointsRedeemed?: number;
    usedMembershipHours?: boolean;
    membershipHoursUsed?: number;
    usedGuestPass?: boolean;
    courtId?: { name?: string };
  };
  const canCancel = bookingQuery.data.canCancel;
  const court = b.courtId;

  return (
    <div className="space-y-6">
      <Link
        href="/account/bookings"
        className="text-sm text-zinc-400 hover:text-white"
      >
        ← Back to bookings
      </Link>

      <div className="rounded-3xl border border-white/10 bg-zinc-900/60 p-6 md:p-8 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white">
              {court?.name || "Court"}
            </h2>
            <p className="text-zinc-400">
              {b.date} · {formatTime12(b.startTime)} · {b.duration}h
            </p>
            <p className="mt-2 inline-flex rounded-lg bg-white/5 px-2 py-1 text-xs capitalize text-zinc-300">
              {String(b.status).replace("_", " ")}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Link
              href={`/booking/verify/${b._id}`}
              className="text-sm text-[#2DD4BF] hover:underline"
            >
              Open verify / QR page
            </Link>
            {b.status === "completed" ? (
              <Link
                href={`/feedback/${b._id}`}
                className="text-sm text-zinc-300 hover:text-white"
              >
                Leave feedback
              </Link>
            ) : null}
          </div>
        </div>

        <PriceBreakdown
          originalPrice={b.originalPrice ?? b.totalPrice}
          discounts={(b.discounts || []) as never[]}
          discountAmount={b.discountAmount || 0}
          totalPrice={b.totalPrice}
        />

        {(Number(b.loyaltyDiscountPkr) > 0 || b.usedMembershipHours) && (
          <div className="text-sm text-zinc-400 space-y-1">
            {Number(b.loyaltyDiscountPkr) > 0 ? (
              <p>
                Loyalty discount: PKR {b.loyaltyDiscountPkr} (
                {b.loyaltyPointsRedeemed} pts)
              </p>
            ) : null}
            {b.usedMembershipHours ? (
              <p>
                Paid with membership hours (
                {b.membershipHoursUsed || b.duration}h)
                {b.usedGuestPass ? " · guest pass used" : ""}
              </p>
            ) : null}
          </div>
        )}

        {canCancel ? (
          <div className="space-y-3 rounded-2xl border border-red-500/20 bg-red-500/5 p-4">
            <p className="text-sm text-zinc-400">
              Cancel online until 4 hours before your slot starts. Loyalty points
              and membership hours are refunded automatically.
            </p>
            {cancelOpen ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => setCancelOpen(false)}
                  disabled={cancelMutation.isPending}
                  className="border-white/20"
                >
                  Keep booking
                </Button>
                <Button
                  onClick={onCancel}
                  disabled={cancelMutation.isPending}
                  className="bg-red-600 text-white hover:bg-red-500"
                >
                  {cancelMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Confirm cancel
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                onClick={() => setCancelOpen(true)}
                className="border-red-500/40 text-red-400 hover:bg-red-500/10"
              >
                Cancel booking
              </Button>
            )}
          </div>
        ) : b.status !== "cancelled" && b.status !== "completed" ? (
          <p className="text-sm text-zinc-500">
            Online cancel is unavailable within 4 hours of start (or for this
            status). Contact the venue if you need help.
          </p>
        ) : null}
      </div>
    </div>
  );
}
