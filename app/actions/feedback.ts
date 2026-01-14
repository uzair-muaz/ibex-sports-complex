'use server';

import connectDB from '@/lib/mongodb';
import Feedback from '@/models/Feedback';
import Booking from '@/models/Booking';
import Court from '@/models/Court';
import { revalidatePath } from 'next/cache';

export interface CreateFeedbackInput {
  bookingId: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  rating: number;
  comment?: string;
}

export async function createFeedback(input: CreateFeedbackInput) {
  try {
    await connectDB();

    // Validate ObjectId format (24 hex characters)
    if (!input.bookingId || input.bookingId.length !== 24 || !/^[0-9a-fA-F]{24}$/.test(input.bookingId)) {
      throw new Error('Invalid booking ID format');
    }

    // Validate rating
    if (input.rating < 1 || input.rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    // Verify booking exists
    const booking = await Booking.findById(input.bookingId);
    if (!booking) {
      throw new Error('Booking not found');
    }

    // Check if feedback already exists for this booking
    const existingFeedback = await Feedback.findOne({ bookingId: input.bookingId });
    if (existingFeedback) {
      throw new Error('Feedback already submitted for this booking');
    }

    // Get court type by fetching the court directly
    // Extract courtId - handle both ObjectId and populated object
    const courtIdValue = typeof booking.courtId === 'object' && booking.courtId?._id
      ? booking.courtId._id.toString()
      : booking.courtId.toString();
    
    // Fetch court to get the type
    const court = await Court.findById(courtIdValue);
    const courtType = court?.type;

    // Create feedback
    const feedback = await Feedback.create({
      bookingId: input.bookingId,
      userName: input.userName,
      userEmail: input.userEmail.toLowerCase(),
      userPhone: input.userPhone,
      rating: input.rating,
      comment: input.comment || '',
      courtType,
    });

    revalidatePath('/admin');
    revalidatePath('/feedback');

    return {
      success: true,
      feedback: JSON.parse(JSON.stringify(feedback)),
    };
  } catch (error: any) {
    console.error('Feedback creation error:', error);
    return {
      success: false,
      error: error.message || 'Failed to create feedback',
    };
  }
}

export async function getAllFeedback() {
  try {
    await connectDB();

    const feedbacks = await Feedback.find()
      .populate('bookingId')
      .sort({ createdAt: -1 });

    // Backfill courtType for feedbacks that don't have it
    const feedbacksWithCourtType = await Promise.all(
      feedbacks.map(async (feedback: any) => {
        // If courtType is missing, try to get it from the booking
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
                // Update the feedback with courtType
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

    return {
      success: true,
      feedbacks: JSON.parse(JSON.stringify(feedbacksWithCourtType)),
    };
  } catch (error: any) {
    console.error('Get all feedback error:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch feedback',
      feedbacks: [],
    };
  }
}

export async function getFeedbackByBookingId(bookingId: string) {
  try {
    await connectDB();

    // Validate ObjectId format (24 hex characters)
    if (!bookingId || bookingId.length !== 24 || !/^[0-9a-fA-F]{24}$/.test(bookingId)) {
      return {
        success: false,
        error: 'Invalid booking ID format',
        feedback: null,
      };
    }

    const feedback = await Feedback.findOne({ bookingId })
      .populate('bookingId');

    if (!feedback) {
      return {
        success: false,
        error: 'Feedback not found',
        feedback: null,
      };
    }

    return {
      success: true,
      feedback: JSON.parse(JSON.stringify(feedback)),
    };
  } catch (error: any) {
    console.error('Get feedback error:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch feedback',
      feedback: null,
    };
  }
}

export async function getBookingById(bookingId: string) {
  try {
    await connectDB();

    // Validate ObjectId format (24 hex characters)
    if (!bookingId || bookingId.length !== 24 || !/^[0-9a-fA-F]{24}$/.test(bookingId)) {
      return {
        success: false,
        error: 'Invalid booking ID format',
        booking: null,
      };
    }

    const booking = await Booking.findById(bookingId)
      .populate('courtId');

    if (!booking) {
      return {
        success: false,
        error: 'Booking not found',
        booking: null,
      };
    }

    return {
      success: true,
      booking: JSON.parse(JSON.stringify(booking)),
    };
  } catch (error: any) {
    console.error('Get booking error:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch booking',
      booking: null,
    };
  }
}
