import mongoose, { Schema, Document, Model, Types } from "mongoose";

/**
 * Remembers an Idempotency-Key for 24 hours, so the same "Book" request sent
 * twice (e.g. a retry on a bad connection) returns the first booking.
 */
export interface IIdempotencyRecord extends Document {
  /** Who sent it + the key, e.g. "user:<id>:<key>" or "guest:<email>:<key>". */
  scopeKey: string;
  /** SHA-256 of the request body, to catch the same key used for a different request. */
  requestHash: string;
  status: "pending" | "done";
  bookingId?: Types.ObjectId | null;
  /** Guests only: their token, so a retry can return it again. Deleted after 24 h. */
  guestAccessToken?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const IdempotencyRecordSchema = new Schema<IIdempotencyRecord>(
  {
    scopeKey: { type: String, required: true, unique: true },
    requestHash: { type: String, required: true },
    status: { type: String, enum: ["pending", "done"], default: "pending" },
    bookingId: { type: Schema.Types.ObjectId, ref: "Booking", default: null },
    guestAccessToken: { type: String, default: null, select: false },
  },
  { timestamps: true },
);

IdempotencyRecordSchema.index({ createdAt: 1 }, { expireAfterSeconds: 24 * 60 * 60 });

const IdempotencyRecord: Model<IIdempotencyRecord> =
  mongoose.models.IdempotencyRecord ||
  mongoose.model<IIdempotencyRecord>("IdempotencyRecord", IdempotencyRecordSchema);

export default IdempotencyRecord;
