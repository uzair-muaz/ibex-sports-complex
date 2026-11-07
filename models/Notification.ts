import mongoose, { Schema, Document, Model } from "mongoose";

export const NOTIFICATION_TYPES = [
  "booking_reminder",
  "proof_submitted",
  "payment_verified",
  "proof_rejected",
  "booking_cancelled",
  "wallet_credited",
  "points_earned",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

/** One message in a customer's in-app list (the bell). */
export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  type: NotificationType;
  title: string;
  body: string;
  bookingId?: mongoose.Types.ObjectId | null;
  amount?: number | null;
  isRead: boolean;
  readAt?: Date | null;
  /** Stops the same message being created twice (e.g. "reminder:<bookingId>"). */
  dedupeKey?: string;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    title: { type: String, required: true, maxlength: 120 },
    body: { type: String, required: true, maxlength: 500 },
    bookingId: { type: Schema.Types.ObjectId, ref: "Booking", default: null },
    amount: { type: Number, default: null },
    isRead: { type: Boolean, default: false },
    readAt: { type: Date, default: null },
    dedupeKey: { type: String },
  },
  { timestamps: true },
);

NotificationSchema.index({ userId: 1, createdAt: -1, _id: -1 });
NotificationSchema.index({ userId: 1, isRead: 1 });
NotificationSchema.index({ dedupeKey: 1 }, { unique: true, partialFilterExpression: { dedupeKey: { $type: "string" } } });

const Notification: Model<INotification> =
  mongoose.models.Notification || mongoose.model<INotification>("Notification", NotificationSchema);

export default Notification;
