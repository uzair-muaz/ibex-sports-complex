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

function getTimeSegments(start: number, duration: number): [number, number][] {
  const end = start + duration;

  if (end <= 24) {
    return [[start, end]];
  }

  // Wrap past midnight: [start, 24) U [0, end - 24)
  return [
    [start, 24],
    [0, end - 24],
  ];
}

function doTimeRangesOverlap(
  startA: number,
  durationA: number,
  startB: number,
  durationB: number,
): boolean {
  const segmentsA = getTimeSegments(startA, durationA);
  const segmentsB = getTimeSegments(startB, durationB);

  // Two ranges overlap if any of their non-wrapping segments intersect
  return segmentsA.some(([aStart, aEnd]) =>
    segmentsB.some(([bStart, bEnd]) => aStart < bEnd && bStart < aEnd),
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

    // Get existing bookings for the date
    const existingBookings = await Booking.find({
      date: input.date,
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

        // Check for overlap, including bookings that span past midnight
        return doTimeRangesOverlap(
          input.startTime,
          input.duration,
          booking.startTime,
          booking.duration,
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

    // Fetch active discounts
    const now = new Date();
    const activeDiscounts = await Discount.find({
      isActive: true,
      validFrom: { $lte: now },
      validUntil: { $gte: now },
    });

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

      const court = booking.courtId as any;
      const finalDate = updateData.date || booking.date;
      const finalStartTime = updateData.startTime !== undefined ? updateData.startTime : booking.startTime;
      const finalDuration = updateData.duration || booking.duration;

      // Check for conflicts if time changed
      if (updateData.date || updateData.startTime || updateData.duration) {
        const existingBookings = await Booking.find({
          date: finalDate,
          status: { $ne: 'cancelled' },
          _id: { $ne: bookingId },
        });

        const hasConflict = existingBookings.some((b) => {
          if (b.courtId.toString() !== court._id.toString()) {
            return false;
          }

          return doTimeRangesOverlap(
            finalStartTime,
            finalDuration,
            b.startTime,
            b.duration,
          );
        });

        if (hasConflict) {
          throw new Error('Time slot conflicts with existing booking');
        }
      }

      // Recalculate price with discounts using peak/off-peak logic
      const { originalPrice } = calculateOriginalPrice(
        court,
        finalStartTime,
        finalDuration
      );

      // Fetch active discounts
      const now = new Date();
      const activeDiscounts = await Discount.find({
        isActive: true,
        validFrom: { $lte: now },
        validUntil: { $gte: now },
      });

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
        court.type,
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

