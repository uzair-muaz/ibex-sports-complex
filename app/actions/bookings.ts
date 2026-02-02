'use server';

import mongoose from 'mongoose';
import connectDB from '@/lib/mongodb';
import Booking from '@/models/Booking';
import Court from '@/models/Court';
import Discount from '@/models/Discount';
import { revalidatePath } from 'next/cache';
import { sendBookingConfirmationEmail } from '@/lib/email';
import { getBaseUrl } from '@/lib/utils';
import { getApplicableDiscounts, calculateDiscountedPrice, DiscountInput } from '@/lib/discount-utils';

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
    const endTime = input.startTime + input.duration;

    for (const court of availableCourts) {
      // Check if this court has any conflicts
      const hasConflict = existingBookings.some((booking) => {
        if (booking.courtId.toString() !== court._id.toString()) {
          return false;
        }

        const bookingEndTime = booking.startTime + booking.duration;

        // Check for overlap
        return (
          (input.startTime >= booking.startTime && input.startTime < bookingEndTime) ||
          (booking.startTime >= input.startTime && booking.startTime < endTime) ||
          (input.startTime <= booking.startTime && endTime >= bookingEndTime)
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

    // Calculate original price (before discounts)
    const originalPrice = assignedCourt.pricePerHour * input.duration;

    // Fetch active discounts
    const now = new Date();
    const activeDiscounts = await Discount.find({
      isActive: true,
      validFrom: { $lte: now },
      validUntil: { $gte: now },
    });

    // Get applicable discounts for this booking
    const discountsData: DiscountInput[] = activeDiscounts.map((d) => ({
      _id: d._id.toString(),
      name: d.name,
      type: d.type,
      value: d.value,
      courtTypes: d.courtTypes,
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

    // Create booking with discount information
    const booking = await Booking.create({
      courtId: assignedCourt._id,
      date: input.date,
      startTime: input.startTime,
      duration: input.duration,
      userName: input.userName,
      userEmail: input.userEmail.toLowerCase(),
      userPhone: input.userPhone,
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
}

export async function updateBooking(input: UpdateBookingInput) {
  try {
    await connectDB();

    const { bookingId, ...updateData } = input;

    // If email is provided, lowercase it
    if (updateData.userEmail) {
      updateData.userEmail = updateData.userEmail.toLowerCase();
    }

    // If amountPaid is provided and > 0, automatically change status to confirmed
    if (updateData.amountPaid !== undefined && updateData.amountPaid > 0) {
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

        const endTime = finalStartTime + finalDuration;
        const hasConflict = existingBookings.some((b) => {
          if (b.courtId.toString() !== court._id.toString()) {
            return false;
          }

          const bookingEndTime = b.startTime + b.duration;
          return (
            (finalStartTime >= b.startTime && finalStartTime < bookingEndTime) ||
            (b.startTime >= finalStartTime && b.startTime < endTime) ||
            (finalStartTime <= b.startTime && endTime >= bookingEndTime)
          );
        });

        if (hasConflict) {
          throw new Error('Time slot conflicts with existing booking');
        }
      }

      // Recalculate price with discounts
      const originalPrice = court.pricePerHour * finalDuration;

      // Fetch active discounts
      const now = new Date();
      const activeDiscounts = await Discount.find({
        isActive: true,
        validFrom: { $lte: now },
        validUntil: { $gte: now },
      });

      // Get applicable discounts
      const discountsData: DiscountInput[] = activeDiscounts.map((d) => ({
        _id: d._id.toString(),
        name: d.name,
        type: d.type,
        value: d.value,
        courtTypes: d.courtTypes,
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

