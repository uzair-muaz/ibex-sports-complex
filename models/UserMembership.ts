import mongoose, { Schema, Document, Model } from "mongoose";

export type UserMembershipStatus = "active" | "expired" | "cancelled";

export interface IUserMembership extends Document {
  userId: mongoose.Types.ObjectId;
  planId: mongoose.Types.ObjectId;
  hoursRemaining: number;
  guestPassesRemaining: number;
  validFrom: Date;
  validUntil: Date;
  status: UserMembershipStatus;
  createdAt: Date;
  updatedAt: Date;
}

const UserMembershipSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    planId: {
      type: Schema.Types.ObjectId,
      ref: "MembershipPlan",
      required: true,
    },
    hoursRemaining: { type: Number, required: true, min: 0 },
    guestPassesRemaining: { type: Number, default: 0, min: 0 },
    validFrom: { type: Date, required: true },
    validUntil: { type: Date, required: true },
    status: {
      type: String,
      enum: ["active", "expired", "cancelled"],
      default: "active",
      index: true,
    },
  },
  { timestamps: true },
);

UserMembershipSchema.index({ userId: 1, status: 1 });
UserMembershipSchema.index({ userId: 1, status: 1, validUntil: 1 });

const UserMembership: Model<IUserMembership> =
  mongoose.models.UserMembership ||
  mongoose.model<IUserMembership>("UserMembership", UserMembershipSchema);

export default UserMembership;
