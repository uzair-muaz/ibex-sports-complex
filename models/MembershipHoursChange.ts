import mongoose, { Schema, Document, Model } from "mongoose";

/**
 * Staff changes to a customer's membership hours bank (the history screen).
 * Hours used and given back by bookings are read from the bookings themselves.
 */
export type MembershipHoursChangeType =
  | "activated"
  | "carried_over"
  | "added"
  | "removed"
  | "extended"
  | "cancelled";

export interface IMembershipHoursChange extends Document {
  userId: mongoose.Types.ObjectId;
  membershipId: mongoose.Types.ObjectId;
  type: MembershipHoursChangeType;
  sport?: string | null;
  /** Signed: + added, − removed. 0 for extend and cancel. */
  hours: number;
  /** Hours left for this sport after the change. */
  remainingAfter?: number | null;
  /** New end date (extend). */
  validUntil?: Date | null;
  note?: string;
  byUserId?: mongoose.Types.ObjectId | null;
  /** One per open staff form, so a double click can't apply it twice. */
  refKey?: string | null;
  createdAt: Date;
}

const MembershipHoursChangeSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    membershipId: { type: Schema.Types.ObjectId, ref: "UserMembership", required: true, index: true },
    type: {
      type: String,
      enum: ["activated", "carried_over", "added", "removed", "extended", "cancelled"],
      required: true,
    },
    sport: { type: String, default: null },
    hours: { type: Number, default: 0 },
    remainingAfter: { type: Number, default: null },
    validUntil: { type: Date, default: null },
    note: { type: String, trim: true, maxlength: 300, default: "" },
    byUserId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    refKey: { type: String, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

MembershipHoursChangeSchema.index(
  { refKey: 1 },
  { unique: true, partialFilterExpression: { refKey: { $type: "string" } } },
);
MembershipHoursChangeSchema.index({ userId: 1, createdAt: -1 });

const MembershipHoursChange: Model<IMembershipHoursChange> =
  mongoose.models.MembershipHoursChange ||
  mongoose.model<IMembershipHoursChange>("MembershipHoursChange", MembershipHoursChangeSchema);

export default MembershipHoursChange;
