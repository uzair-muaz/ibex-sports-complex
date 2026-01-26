import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import connectDB from '@/lib/mongodb';
import Feedback from '@/models/Feedback';
import Booking from '@/models/Booking';
import Court from '@/models/Court';
import { isBuildTime } from '@/lib/build-utils';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function checkAuth(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    return { authorized: false, response: NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }) };
  }

  const userRole = (token as { role?: string })?.role;
  if (userRole !== 'super_admin' && userRole !== 'admin') {
    return { authorized: false, response: NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 }) };
  }

  return { authorized: true, token };
}

export async function GET(request: NextRequest) {
  if (isBuildTime()) {
    return NextResponse.json({
      success: true,
      feedbacks: [],
    });
  }

  const { searchParams } = new URL(request.url);
  const bookingId = searchParams.get('bookingId');
  const all = searchParams.get('all') === 'true';

  // If fetching all feedback, require auth
  if (all) {
    const authCheck = await checkAuth(request);
    if (!authCheck.authorized) {
      return authCheck.response;
    }
  }

  try {
    await connectDB();

    if (bookingId) {
      // Get feedback by booking ID (public endpoint)
      if (!bookingId || bookingId.length !== 24 || !/^[0-9a-fA-F]{24}$/.test(bookingId)) {
        return NextResponse.json(
          { success: false, error: 'Invalid booking ID format', feedback: null },
          { status: 400 }
        );
      }

      const feedback = await Feedback.findOne({ bookingId }).populate('bookingId');

      if (!feedback) {
        return NextResponse.json(
          { success: false, error: 'Feedback not found', feedback: null },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        feedback: JSON.parse(JSON.stringify(feedback)),
      });
    } else if (all) {
      // Get all feedback (admin only)
      const feedbacks = await Feedback.find()
        .populate('bookingId')
        .sort({ createdAt: -1 });

      const feedbacksWithCourtType = await Promise.all(
        feedbacks.map(async (feedback: any) => {
          if (!feedback.courtType && feedback.bookingId) {
            try {
              const bookingIdValue = typeof feedback.bookingId === 'object' && feedback.bookingId?._id
                ? feedback.bookingId._id.toString()
                : feedback.bookingId.toString();

              const booking = await Booking.findById(bookingIdValue);
              if (booking) {
                const courtIdValue = typeof booking.courtId === 'object' && booking.courtId?._id
                  ? booking.courtId._id.toString()
                  : booking.courtId.toString();
                
                const court = await Court.findById(courtIdValue);
                if (court?.type) {
                  await Feedback.findByIdAndUpdate(feedback._id, { courtType: court.type });
                  feedback.courtType = court.type;
                }
              }
            } catch (error) {
              console.error('Error backfilling courtType for feedback:', feedback._id, error);
            }
          }
          return feedback;
        })
      );

      return NextResponse.json({
        success: true,
        feedbacks: JSON.parse(JSON.stringify(feedbacksWithCourtType)),
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Missing parameter: bookingId or all' },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('Get feedback error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch feedback',
        feedbacks: [],
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  if (isBuildTime()) {
    return NextResponse.json(
      { success: false, error: 'Cannot create feedback during build' },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { bookingId, userName, userEmail, userPhone, rating, comment } = body;

    if (!bookingId || !userName || !userEmail || !userPhone || !rating) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!bookingId || bookingId.length !== 24 || !/^[0-9a-fA-F]{24}$/.test(bookingId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid booking ID format' },
        { status: 400 }
      );
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { success: false, error: 'Rating must be between 1 and 5' },
        { status: 400 }
      );
    }

    await connectDB();

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 }
      );
    }

    const existingFeedback = await Feedback.findOne({ bookingId });
    if (existingFeedback) {
      return NextResponse.json(
        { success: false, error: 'Feedback already submitted for this booking' },
        { status: 400 }
      );
    }

    const courtIdValue = typeof booking.courtId === 'object' && booking.courtId?._id
      ? booking.courtId._id.toString()
      : booking.courtId.toString();
    
    const court = await Court.findById(courtIdValue);
    const courtType = court?.type;

    const feedback = await Feedback.create({
      bookingId,
      userName,
      userEmail: userEmail.toLowerCase(),
      userPhone,
      rating,
      comment: comment || '',
      courtType,
    });

    return NextResponse.json({
      success: true,
      feedback: JSON.parse(JSON.stringify(feedback)),
    });
  } catch (error: any) {
    console.error('Feedback creation error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create feedback' },
      { status: 500 }
    );
  }
}
