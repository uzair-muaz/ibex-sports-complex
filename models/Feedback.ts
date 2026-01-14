import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IFeedback extends Document {
  bookingId: mongoose.Types.ObjectId;
  userName: string;
  userEmail: string;
  userPhone: string;
  rating: number; // 1-5 stars
  comment?: string;
  courtType?: string;
  createdAt: Date;
  updatedAt: Date;
}

const FeedbackSchema: Schema = new Schema(
  {
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
      required: [true, 'Booking ID is required'],
    },
    userName: {
      type: String,
      required: [true, 'User name is required'],
      trim: true,
    },
    userEmail: {
      type: String,
      required: [true, 'User email is required'],
      lowercase: true,
      trim: true,
    },
    userPhone: {
      type: String,
      required: [true, 'User phone is required'],
      trim: true,
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    courtType: {
      type: String,
      enum: ['PADEL', 'CRICKET', 'PICKLEBALL', 'FUTSAL'],
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
FeedbackSchema.index({ bookingId: 1 });
FeedbackSchema.index({ createdAt: -1 });
FeedbackSchema.index({ rating: 1 });

const Feedback: Model<IFeedback> = mongoose.models.Feedback || mongoose.model<IFeedback>('Feedback', FeedbackSchema);

export default Feedback;
