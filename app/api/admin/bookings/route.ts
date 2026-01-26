import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import mongoose from 'mongoose';
import connectDB from '@/lib/mongodb';
import Booking from '@/models/Booking';
import Court from '@/models/Court';
import { isBuildTime } from '@/lib/build-utils';

// Mark this route as dynamic to prevent static analysis during build
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function checkAuth(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    return { authorized: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const userRole = (token as { role?: string })?.role;
  if (userRole !== 'super_admin' && userRole !== 'admin') {
    return { authorized: false, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { authorized: true, token };
}

export async function GET(request: NextRequest) {
  if (isBuildTime()) {
    return NextResponse.json({
      success: true,
      bookings: [],
    });
  }

  try {
    const authCheck = await checkAuth(request);
    if (!authCheck.authorized) {
      return authCheck.response;
    }

    await connectDB();

    // Ensure Court model is registered - the import should handle this,
    // but we explicitly reference it to ensure it's loaded
    if (!mongoose.models.Court) {
      // Model should be registered on import, but if not, this will trigger registration
      const _ = Court;
    }

    const bookings = await Booking.find()
      .populate({
        path: 'courtId',
        model: 'Court'
      })
      .sort({ createdAt: -1 })
      .maxTimeMS(10000)
      .lean();

    return NextResponse.json({
      success: true,
      bookings: bookings,
    });
  } catch (error: any) {
    console.error('Get all bookings error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch bookings',
        bookings: [],
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  if (isBuildTime()) {
    return NextResponse.json(
      { error: 'Cannot update booking during build' },
      { status: 503 }
    );
  }

  try {
    const authCheck = await checkAuth(request);
    if (!authCheck.authorized) {
      return authCheck.response;
    }

    const body = await request.json();
    const { bookingId, ...updateData } = body;

    if (!bookingId) {
      return NextResponse.json(
        { error: 'Booking ID is required' },
        { status: 400 }
      );
    }

    await connectDB();

    if (updateData.userEmail) {
      updateData.userEmail = updateData.userEmail.toLowerCase();
    }

    if (updateData.amountPaid !== undefined && updateData.amountPaid > 0) {
      updateData.status = 'confirmed';
    }

    if (updateData.date || updateData.startTime || updateData.duration) {
      const booking = await Booking.findById(bookingId)
        .populate({
          path: 'courtId',
          model: 'Court'
        })
        .maxTimeMS(10000);
      if (!booking) {
        return NextResponse.json(
          { error: 'Booking not found' },
          { status: 404 }
        );
      }

      const court = booking.courtId as any;
      const finalDate = updateData.date || booking.date;
      const finalStartTime = updateData.startTime !== undefined ? updateData.startTime : booking.startTime;
      const finalDuration = updateData.duration || booking.duration;

      if (updateData.date || updateData.startTime || updateData.duration) {
        const existingBookings = await Booking.find({
          date: finalDate,
          status: { $ne: 'cancelled' },
          _id: { $ne: bookingId },
        })
          .maxTimeMS(10000);

        const endTime = finalStartTime + finalDuration;
        const hasConflict = existingBookings.some((existing) => {
          if (existing.courtId.toString() !== court._id.toString()) {
            return false;
          }

          const existingEndTime = existing.startTime + existing.duration;
          return (
            (finalStartTime >= existing.startTime && finalStartTime < existingEndTime) ||
            (existing.startTime >= finalStartTime && existing.startTime < endTime) ||
            (finalStartTime <= existing.startTime && endTime >= existingEndTime)
          );
        });

        if (hasConflict) {
          return NextResponse.json(
            { error: 'Time slot conflict with existing booking' },
            { status: 400 }
          );
        }
      }

      updateData.totalPrice = court.pricePerHour * finalDuration;
    }

    const updatedBooking = await Booking.findByIdAndUpdate(
      bookingId,
      updateData,
      { new: true, runValidators: true }
    )
      .populate({
        path: 'courtId',
        model: 'Court'
      })
      .maxTimeMS(10000)
      .lean();

    if (!updatedBooking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      booking: updatedBooking,
    });
  } catch (error: any) {
    console.error('Update booking error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to update booking',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  if (isBuildTime()) {
    return NextResponse.json(
      { error: 'Cannot delete booking during build' },
      { status: 503 }
    );
  }

  try {
    const authCheck = await checkAuth(request);
    if (!authCheck.authorized) {
      return authCheck.response;
    }

    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get('id');

    if (!bookingId) {
      return NextResponse.json(
        { error: 'Booking ID is required' },
        { status: 400 }
      );
    }

    await connectDB();

    const booking = await Booking.findByIdAndDelete(bookingId).maxTimeMS(10000);

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error: any) {
    console.error('Delete booking error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to delete booking',
      },
      { status: 500 }
    );
  }
}
