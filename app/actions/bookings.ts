'use server';

import mongoose from 'mongoose';
import connectDB from '@/lib/mongodb';
import Booking from '@/models/Booking';
import Court from '@/models/Court';
import Discount from '@/models/Discount';
import { auth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { sendBookingConfirmationEmail } from '@/lib/email';
import { getBaseUrl } from '@/lib/utils';
import { getApplicableDiscounts, calculateDiscountedPrice, DiscountInput } from '@/lib/discount-utils';
import { calculateOriginalPrice } from '@/lib/pricing-utils';
import type { AppliedDiscount } from '@/types';
import { BUSINESS_TIMEZONE, toDateKeyInTimezone } from '@/lib/date-time';

async function getActiveDiscountsForBusinessDate() {
  const todayKey = toDateKeyInTimezone(new Date(), BUSINESS_TIMEZONE);
  const discountsRaw = await Discount.find({ isActive: true });
  return discountsRaw.filter((d: any) => {
    const fromKey = toDateKeyInTimezone(new Date(d.validFrom), BUSINESS_TIMEZONE);
    const untilKey = toDateKeyInTimezone(new Date(d.validUntil), BUSINESS_TIMEZONE);
    return fromKey <= todayKey && todayKey <= untilKey;
  });
}

function toDayIndexUTC(dateStr: string): number {
  // dateStr is YYYY-MM-DD in LOCAL storage (no timezone).
  // Use UTC midnight to get a stable day index without DST surprises.
  const [y, m, d] = dateStr.split("-").map((x) => Number(x));
  const utcMs = Date.UTC(y, m - 1, d);
  return Math.floor(utcMs / 86400000);
}

function shiftDateUTC(dateStr: string, deltaDays: number): string {
  const [y, m, d] = dateStr.split("-").map((x) => Number(x));
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + deltaDays);
  const y2 = dt.getUTCFullYear();
  const m2 = dt.getUTCMonth() + 1;
  const d2 = dt.getUTCDate();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${y2}-${pad(m2)}-${pad(d2)}`;
}

function rangesOverlapHalfOpen(
  startA: number,
  endA: number,
  startB: number,
  endB: number,
): boolean {
  // Half-open overlap: [start, end)
  return startA < endB && startB < endA;
}

function bookingOverlapsCandidate(
  referenceDateStr: string,
  candidateStartTime: number,
  candidateDuration: number,
  booking: { date: string; startTime: number; duration: number },
): boolean {
  const referenceDay = toDayIndexUTC(referenceDateStr);
  const bookingDay = toDayIndexUTC(booking.date);

  const candidateStartAbs = Number(candidateStartTime);
  const candidateEndAbs = candidateStartAbs + Number(candidateDuration);

  const bookingStartAbs =
    (bookingDay - referenceDay) * 24 + Number(booking.startTime);
  const bookingEndAbs = bookingStartAbs + Number(booking.duration);

  return rangesOverlapHalfOpen(
    candidateStartAbs,
    candidateEndAbs,
    bookingStartAbs,
    bookingEndAbs,
  );
}

export interface CreateBookingInput {
  courtType: 'PADEL' | 'CRICKET' | 'PICKLEBALL' | 'FUTSAL';
  date: string;
  startTime: number;
  duration: number;
  userName: string;
  userEmail: string;
  userPhone: string;
}

export async function createBooking(input: CreateBookingInput) {
  try {
    await connectDB();

    // Validate phone number
    if (!input.userPhone || input.userPhone.trim().length === 0) {
      throw new Error('Phone number is required');
    }

    // Validate minimum booking time (1 hour for most courts, 1.5 hours for Futsal)
    const minDuration = input.courtType === 'FUTSAL' ? 1.5 : 1;
    if (input.duration < minDuration) {
      throw new Error(input.courtType === 'FUTSAL' 
        ? 'Minimum booking time for Futsal is 90 minutes' 
        : 'Minimum booking time is 1 hour');
    }

    // Validate duration increments (can be 1, 1.5, 2, 2.5, etc.)
    if (input.duration % 0.5 !== 0) {
      throw new Error('Duration must be in 30-minute increments');
    }

    // Get all active courts of the selected type
    const availableCourts = await Court.find({
      type: input.courtType,
      isActive: true,
    }).sort({ createdAt: 1 });

    if (availableCourts.length === 0) {
      throw new Error(`No ${input.courtType} courts available`);
    }

    // Get existing bookings around the date we are trying to book.
    // Because bookings can span midnight, conflicts may involve bookings
    // from the day before or the day after.
    const dateMinus = shiftDateUTC(input.date, -1);
    const datePlus = shiftDateUTC(input.date, 1);
    const existingBookings = await Booking.find({
      date: { $in: [dateMinus, input.date, datePlus] },
      status: { $ne: 'cancelled' },
    });

    // Find available court
    let assignedCourt = null;

    for (const court of availableCourts) {
        // Check if this court has any conflicts
      const hasConflict = existingBookings.some((booking) => {
        if (booking.courtId.toString() !== court._id.toString()) {
          return false;
        }

          // Check for overlap on an absolute calendar timeline
          return bookingOverlapsCandidate(
            input.date,
            input.startTime,
            input.duration,
            booking,
          );
      });

      if (!hasConflict) {
        assignedCourt = court;
        break;
      }
    }

    if (!assignedCourt) {
      throw new Error('No available courts for the selected time slot');
    }

    // Calculate original price (before discounts) with peak/off-peak support
    const { originalPrice } = calculateOriginalPrice(
      assignedCourt,
      input.startTime,
      input.duration
    );

    // Fetch active discounts using business timezone date boundary
    const activeDiscounts = await getActiveDiscountsForBusinessDate();

    // Get applicable discounts for this booking (empty courtTypes = all court types)
    const discountsData: DiscountInput[] = activeDiscounts.map((d) => ({
      _id: d._id.toString(),
      name: d.name,
      type: d.type,
      value: d.value,
      courtTypes: Array.isArray(d.courtTypes) ? d.courtTypes : [],
      allDay: d.allDay,
      startHour: d.startHour,
      endHour: d.endHour,
      validFrom: d.validFrom,
      validUntil: d.validUntil,
      isActive: d.isActive,
    }));

    const applicableDiscounts = getApplicableDiscounts(
      discountsData,
      input.courtType,
      input.startTime,
      input.date
    );

    // Calculate discounted price
    const { finalPrice, discountAmount, appliedDiscounts } = calculateDiscountedPrice(
      originalPrice,
      applicableDiscounts
    );

    // Convert discounts for Mongoose (string discountId to ObjectId)
    const discountsForDB = appliedDiscounts.map((d) => ({
      discountId: new mongoose.Types.ObjectId(d.discountId),
      name: d.name,
      type: d.type,
      value: d.value,
      amountSaved: d.amountSaved,
    }));

    // Determine next booking serial number (incremental)
    const lastBooking = await Booking.findOne().sort({ serialNumber: -1, createdAt: -1 });
    const nextSerialNumber = (lastBooking?.serialNumber ?? 0) + 1;

    // Create booking with discount information
    const booking = await Booking.create({
      courtId: assignedCourt._id,
      date: input.date,
      startTime: input.startTime,
      duration: input.duration,
      userName: input.userName,
      userEmail: input.userEmail.toLowerCase(),
      userPhone: input.userPhone,
      serialNumber: nextSerialNumber,
      originalPrice,
      discounts: discountsForDB,
      discountAmount,
      totalPrice: finalPrice,
      status: 'pending_payment',
      amountPaid: 0,
    });

    await booking.populate('courtId');

    // Send confirmation email (non-blocking)
    const court = booking.courtId as any;
    const emailResult = await sendBookingConfirmationEmail({
      userName: input.userName,
      userEmail: input.userEmail.toLowerCase(),
      courtName: court?.name || 'Court',
      date: input.date,
      startTime: input.startTime,
      duration: input.duration,
      originalPrice,
      discounts: appliedDiscounts, // Already has string discountId
      discountAmount,
      totalPrice: finalPrice,
      bookingId: booking._id.toString(),
      baseUrl: getBaseUrl(),
    }).catch((error) => {
      // Log error but don't fail the booking creation
      console.error('Failed to send confirmation email:', error);
      return { success: false, message: error.message || 'Failed to send email' };
    });

    revalidatePath('/booking');
    revalidatePath('/admin');

    return {
      success: true,
      booking: JSON.parse(JSON.stringify(booking)),
      emailSent: emailResult?.success || false,
      emailMessage: emailResult?.message,
    };
  } catch (error: any) {
    console.error('Booking creation error:', error);
    return {
      success: false,
      error: error.message || 'Failed to create booking',
    };
  }
}

export interface GetAvailableStartTimesInput {
  courtType: 'PADEL' | 'CRICKET' | 'PICKLEBALL' | 'FUTSAL';
  date: string; // YYYY-MM-DD (calendar day semantics)
  duration: number; // hours in 0.5 increments
  /** When editing a booking, omit it from conflict checks so its time stays bookable */
  excludeBookingId?: string;
}

export interface AvailableStartTimeQuote {
  startTime: number; // decimal hour: 0, 0.5, ..., 23.5
  assignedCourtId: string;
  assignedCourtName: string;
  originalPrice: number;
  totalPrice: number; // finalPrice after discounts
  discountAmount: number;
  appliedDiscounts: AppliedDiscount[];
}

export async function getAvailableStartTimes(
  input: GetAvailableStartTimesInput,
): Promise<{ success: true; startTimes: AvailableStartTimeQuote[] } | { success: false; error: string; startTimes: [] }> {
  try {
    await connectDB();

    if (input.duration <= 0) {
      return { success: false, error: 'Duration must be greater than 0', startTimes: [] };
    }

    const minDuration = input.courtType === 'FUTSAL' ? 1.5 : 1;
    if (input.duration < minDuration) {
      return {
        success: false,
        error:
          input.courtType === 'FUTSAL'
            ? 'Minimum booking time for Futsal is 90 minutes'
            : 'Minimum booking time is 1 hour',
        startTimes: [],
      };
    }

    if (input.duration % 0.5 !== 0) {
      return { success: false, error: 'Duration must be in 30-minute increments', startTimes: [] };
    }

    const courts = await Court.find({ type: input.courtType, isActive: true }).sort({ createdAt: 1 });
    if (courts.length === 0) {
      return { success: false, error: `No ${input.courtType} courts available`, startTimes: [] };
    }

    const dateMinus = shiftDateUTC(input.date, -1);
    const datePlus = shiftDateUTC(input.date, 1);
    const existingBookings = await Booking.find({
      date: { $in: [dateMinus, input.date, datePlus] },
      status: { $ne: 'cancelled' },
    });

    // Fetch active discounts once (pricing varies per startTime due to time restrictions).
    const activeDiscounts = await getActiveDiscountsForBusinessDate();

    const discountsData: DiscountInput[] = activeDiscounts.map((d) => ({
      _id: d._id.toString(),
      name: d.name,
      type: d.type,
      value: d.value,
      courtTypes: Array.isArray(d.courtTypes) ? d.courtTypes : [],
      allDay: d.allDay,
      startHour: d.startHour,
      endHour: d.endHour,
      validFrom: d.validFrom,
      validUntil: d.validUntil,
      isActive: d.isActive,
    }));

    const results: AvailableStartTimeQuote[] = [];
    const slotCount = 48; // 0..23.5 in 0.5 increments

    for (let i = 0; i < slotCount; i++) {
      const startTime = Number((i * 0.5).toFixed(1));
      let assignedCourt: typeof courts[number] | null = null;

      for (const court of courts) {
        const hasConflict = existingBookings.some((booking) => {
          if (
            input.excludeBookingId &&
            booking._id.toString() === input.excludeBookingId
          ) {
            return false;
          }
          if (booking.courtId.toString() !== court._id.toString()) return false;
          return bookingOverlapsCandidate(input.date, startTime, input.duration, booking);
        });

        if (!hasConflict) {
          assignedCourt = court;
          break; // deterministic: first available court (same as createBooking)
        }
      }

      if (!assignedCourt) continue;

      const { originalPrice } = calculateOriginalPrice(assignedCourt, startTime, input.duration);
      const applicable = getApplicableDiscounts(discountsData, input.courtType, startTime, input.date);
      const { finalPrice, discountAmount, appliedDiscounts } = calculateDiscountedPrice(originalPrice, applicable);

      results.push({
        startTime,
        assignedCourtId: assignedCourt._id.toString(),
        assignedCourtName: assignedCourt.name,
        originalPrice,
        totalPrice: finalPrice,
        discountAmount,
        appliedDiscounts,
      });
    }

    return { success: true, startTimes: results };
  } catch (error: any) {
    console.error('getAvailableStartTimes error:', error);
    return { success: false, error: error.message || 'Failed to fetch availability', startTimes: [] };
  }
}

export async function getBookingsByDate(date: string) {
  try {
    await connectDB();

    const bookings = await Booking.find({
      date,
      status: { $ne: 'cancelled' },
    })
      .populate('courtId')
      .sort({ startTime: 1 });

    return {
      success: true,
      bookings: JSON.parse(JSON.stringify(bookings)),
    };
  } catch (error: any) {
    console.error('Get bookings error:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch bookings',
      bookings: [],
    };
  }
}

export async function getAllBookings() {
  try {
    await connectDB();

    const bookings = await Booking.find()
      .populate('courtId')
      // Default ordering: newest bookings first
      .sort({ createdAt: -1 });

    return {
      success: true,
      bookings: JSON.parse(JSON.stringify(bookings)),
    };
  } catch (error: any) {
    console.error('Get all bookings error:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch bookings',
      bookings: [],
    };
  }
}

export async function cancelBooking(bookingId: string) {
  try {
    await connectDB();

    const booking = await Booking.findByIdAndUpdate(
      bookingId,
      { status: 'cancelled' },
      { new: true }
    );

    if (!booking) {
      throw new Error('Booking not found');
    }

    revalidatePath('/admin');
    revalidatePath('/booking');

    return {
      success: true,
      booking: JSON.parse(JSON.stringify(booking)),
    };
  } catch (error: any) {
    console.error('Cancel booking error:', error);
    return {
      success: false,
      error: error.message || 'Failed to cancel booking',
    };
  }
}

export interface UpdateBookingInput {
  bookingId: string;
  /** When rescheduling, set to the court from availability (first free court for that slot). */
  courtId?: string;
  date?: string;
  startTime?: number;
  duration?: number;
  userName?: string;
  userEmail?: string;
  userPhone?: string;
  status?: 'pending_payment' | 'confirmed' | 'cancelled' | 'completed';
  totalPrice?: number;
  amountPaid?: number;
  amountReceivedOnline?: number;
  amountReceivedCash?: number;
}

export async function updateBooking(input: UpdateBookingInput) {
  try {
    await connectDB();

    const { bookingId, ...updateData } = input;

    // If email is provided, lowercase it
    if (updateData.userEmail) {
      updateData.userEmail = updateData.userEmail.toLowerCase();
    }

    // When received amounts are provided, set amountPaid = online + cash (for backward compat and analytics)
    if (updateData.amountReceivedOnline !== undefined || updateData.amountReceivedCash !== undefined) {
      const online = updateData.amountReceivedOnline ?? 0;
      const cash = updateData.amountReceivedCash ?? 0;
      (updateData as any).amountPaid = online + cash;
      (updateData as any).amountReceivedOnline = online;
      (updateData as any).amountReceivedCash = cash;
    }
    // If amountPaid is provided and > 0, automatically change status to confirmed
    // BUT only if status wasn't explicitly set (to allow manual status changes like 'completed')
    if (updateData.amountPaid !== undefined && updateData.amountPaid > 0 && input.status === undefined) {
      updateData.status = 'confirmed';
    }

    // If date or time changed, recalculate price with discounts
    if (updateData.date || updateData.startTime || updateData.duration) {
      const booking = await Booking.findById(bookingId).populate('courtId');
      if (!booking) {
        throw new Error('Booking not found');
      }

      const originalCourt = booking.courtId as any;
      const finalDate = updateData.date || booking.date;
      const finalStartTime = updateData.startTime !== undefined ? updateData.startTime : booking.startTime;
      const finalDuration = updateData.duration || booking.duration;

      let courtForSlot = originalCourt;
      const requestedCourtId = (updateData as { courtId?: string }).courtId;
      if (requestedCourtId) {
        const switched = await Court.findById(requestedCourtId);
        if (!switched || !switched.isActive) {
          throw new Error('Selected court is not available');
        }
        if (switched.type !== originalCourt.type) {
          throw new Error('Selected court does not match this booking type');
        }
        courtForSlot = switched;
      }

      // Check for conflicts if time changed
      if (updateData.date || updateData.startTime || updateData.duration) {
        const dateMinus = shiftDateUTC(finalDate, -1);
        const datePlus = shiftDateUTC(finalDate, 1);
        const existingBookings = await Booking.find({
          date: { $in: [dateMinus, finalDate, datePlus] },
          status: { $ne: 'cancelled' },
          _id: { $ne: bookingId },
        });

        const hasConflict = existingBookings.some((b) => {
          if (b.courtId.toString() !== courtForSlot._id.toString()) {
            return false;
          }

          return bookingOverlapsCandidate(
            finalDate,
            finalStartTime,
            finalDuration,
            b,
          );
        });

        if (hasConflict) {
          throw new Error('Time slot conflicts with existing booking');
        }
      }

      // Recalculate price with discounts using peak/off-peak logic
      const { originalPrice } = calculateOriginalPrice(
        courtForSlot,
        finalStartTime,
        finalDuration
      );

      // Fetch active discounts using business timezone date boundary
      const activeDiscounts = await getActiveDiscountsForBusinessDate();

      // Get applicable discounts (empty courtTypes = all court types)
      const discountsData: DiscountInput[] = activeDiscounts.map((d) => ({
        _id: d._id.toString(),
        name: d.name,
        type: d.type,
        value: d.value,
        courtTypes: Array.isArray(d.courtTypes) ? d.courtTypes : [],
        allDay: d.allDay,
        startHour: d.startHour,
        endHour: d.endHour,
        validFrom: d.validFrom,
        validUntil: d.validUntil,
        isActive: d.isActive,
      }));

      const applicableDiscounts = getApplicableDiscounts(
        discountsData,
        courtForSlot.type,
        finalStartTime,
        finalDate
      );

      const { finalPrice, discountAmount, appliedDiscounts } = calculateDiscountedPrice(
        originalPrice,
        applicableDiscounts
      );

      (updateData as any).originalPrice = originalPrice;
      (updateData as any).discounts = appliedDiscounts;
      (updateData as any).discountAmount = discountAmount;
      updateData.totalPrice = finalPrice;
    }

    const updatedBooking = await Booking.findByIdAndUpdate(
      bookingId,
      updateData,
      { new: true, runValidators: true }
    ).populate('courtId');

    if (!updatedBooking) {
      throw new Error('Booking not found');
    }

    revalidatePath('/admin');
    revalidatePath('/booking');

    return {
      success: true,
      booking: JSON.parse(JSON.stringify(updatedBooking)),
    };
  } catch (error: any) {
    console.error('Update booking error:', error);
    return {
      success: false,
      error: error.message || 'Failed to update booking',
    };
  }
}

export interface ExtendBookingInput {
  bookingId: string;
  extraDuration: 0.5 | 1;
}

export async function checkBookingExtensionAvailability(bookingId: string) {
  try {
    await connectDB();

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return { success: false, error: "Booking not found" };
    }
    if (booking.status === "cancelled" || booking.status === "completed") {
      return { success: false, error: "This booking cannot be extended" };
    }

    const dateMinus = shiftDateUTC(booking.date, -1);
    const datePlus = shiftDateUTC(booking.date, 1);
    const existingBookings = await Booking.find({
      date: { $in: [dateMinus, booking.date, datePlus] },
      status: { $ne: "cancelled" },
      _id: { $ne: bookingId },
      courtId: booking.courtId,
    });

    const canExtendBy = (extraDuration: 0.5 | 1): boolean => {
      const candidateDuration = booking.duration + extraDuration;
      if (candidateDuration > 12) return false;
      return !existingBookings.some((b) =>
        bookingOverlapsCandidate(booking.date, booking.startTime, candidateDuration, b),
      );
    };

    const canExtend30 = canExtendBy(0.5);
    const canExtend60 = canExtendBy(1);

    return {
      success: true,
      canExtend30,
      canExtend60,
      hasAnyOption: canExtend30 || canExtend60,
    };
  } catch (error: any) {
    console.error("checkBookingExtensionAvailability error:", error);
    return { success: false, error: error.message || "Failed to check extension availability" };
  }
}

export async function extendBooking(input: ExtendBookingInput) {
  try {
    await connectDB();

    if (input.extraDuration % 0.5 !== 0) {
      return { success: false, error: "Extra duration must be in 30-minute increments" };
    }

    const booking = await Booking.findById(input.bookingId);
    if (!booking) {
      return { success: false, error: "Booking not found" };
    }

    if (booking.status === "cancelled" || booking.status === "completed") {
      return { success: false, error: "This booking cannot be extended" };
    }

    const nextDuration = booking.duration + input.extraDuration;
    if (nextDuration > 12) {
      return { success: false, error: "Cannot extend beyond 12 hours" };
    }

    // Delegate to updateBooking so pricing + conflict validation stays consistent.
    return await updateBooking({
      bookingId: input.bookingId,
      duration: nextDuration,
    });
  } catch (error: any) {
    console.error("Extend booking error:", error);
    return { success: false, error: error.message || "Failed to extend booking" };
  }
}

export async function deleteBooking(bookingId: string) {
  try {
    const session = await auth();
    const role = (session?.user as { role?: string })?.role;
    if (role !== 'super_admin') {
      return {
        success: false,
        error: 'Only super admin can delete bookings.',
      };
    }

    await connectDB();

    const booking = await Booking.findByIdAndDelete(bookingId);

    if (!booking) {
      throw new Error('Booking not found');
    }

    revalidatePath('/admin');
    revalidatePath('/booking');

    return {
      success: true,
    };
  } catch (error: any) {
    console.error('Delete booking error:', error);
    return {
      success: false,
      error: error.message || 'Failed to delete booking',
    };
  }
}

