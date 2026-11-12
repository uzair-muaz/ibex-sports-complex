import mongoose, { Schema, Document, Model, Types } from "mongoose";

/**
 * One row per court per half hour that a booking covers. The unique index
 * means only one booking can hold a half hour, so two people pressing
 * "Book" at the same moment can't both get it. See lib/booking-locks.ts.
 */
export interface ISlotLock extends Document {
  courtId: Types.ObjectId;
  /** Absolute half-hour number: dayIndex × 48 + (startHour × 2). */
  cell: number;
  bookingId: Types.ObjectId;
  /** When this row can be deleted (a day after the half hour). */
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SlotLockSchema = new Schema<ISlotLock>(
  {
    courtId: { type: Schema.Types.ObjectId, ref: "Court", required: true },
    cell: { type: Number, required: true },
    bookingId: { type: Schema.Types.ObjectId, ref: "Booking", required: true, index: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

SlotLockSchema.index({ courtId: 1, cell: 1 }, { unique: true });
SlotLockSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const SlotLock: Model<ISlotLock> =
  mongoose.models.SlotLock || mongoose.model<ISlotLock>("SlotLock", SlotLockSchema);

export default SlotLock;
