import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/mongodb';
import Booking from '@/models/Booking';
import Court from '@/models/Court';
import { isBuildTime } from '@/lib/build-utils';

// Mark this route as dynamic to prevent static analysis during build
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (isBuildTime()) {
    return NextResponse.json(
      { error: 'Cannot fetch booking during build' },
      { status: 503 }
    );
  }

  try {
    const { id } = params;

    if (!id || id.length !== 24 || !/^[0-9a-fA-F]{24}$/.test(id)) {
      return NextResponse.json(
        { error: 'Invalid booking ID' },
        { status: 400 }
      );
    }

    await connectDB();

    // Ensure Court model is registered before populating
    if (!mongoose.models.Court) {
      const _ = Court;
    }

    const booking = await Booking.findById(id)
      .populate({
        path: 'courtId',
        model: 'Court'
      })
      .maxTimeMS(10000)
      .lean();

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      booking: booking,
    });
  } catch (error: any) {
    console.error('Get booking error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch booking',
      },
      { status: 500 }
    );
  }
}
