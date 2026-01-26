import mongoose, { Schema, Document, Model } from 'mongoose';

export type BookingStatus = 'pending_payment' | 'confirmed' | 'cancelled' | 'completed';

export interface IBooking extends Document {
  courtId: mongoose.Types.ObjectId;
  date: string; // YYYY-MM-DD
  startTime: number; // Hour (0-23)
  duration: number; // Hours (minimum 1, can add 0.5 for 30 min)
  userName: string;
  userEmail: string;
  userPhone: string;
  status: BookingStatus;
  totalPrice: number;
  amountPaid: number;
  createdAt: Date;
  updatedAt: Date;
}

const BookingSchema: Schema = new Schema(
  {
    courtId: {
      type: Schema.Types.ObjectId,
      ref: 'Court',
      required: [true, 'Court ID is required'],
    },
    date: {
      type: String,
      required: [true, 'Date is required'],
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'],
    },
    startTime: {
      type: Number,
      required: [true, 'Start time is required'],
      min: 0,
      max: 23,
    },
    duration: {
      type: Number,
      required: [true, 'Duration is required'],
      min: 1,
      max: 12,
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
    status: {
      type: String,
      enum: ['pending_payment', 'confirmed', 'cancelled', 'completed'],
      default: 'pending_payment',
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    amountPaid: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
BookingSchema.index({ courtId: 1, date: 1, startTime: 1 });
BookingSchema.index({ date: 1, status: 1 });

// Delete the model if it exists to force recompilation with new schema
if (mongoose.models.Booking) {
  delete mongoose.models.Booking;
}

const Booking: Model<IBooking> = mongoose.model<IBooking>('Booking', BookingSchema);

export default Booking;

