import { SPORT_CODE_RE } from "@/lib/sport-rules";
import mongoose, { Schema, Document, Model } from "mongoose";

export type UserMembershipStatus = "active" | "expired" | "cancelled";

import { MEMBERSHIP_PAYMENT_METHODS, type MembershipPaymentMethod } from "@/lib/membership-payment";
export { MEMBERSHIP_PAYMENT_METHODS, type MembershipPaymentMethod };

export interface IUserMembership extends Document {
  userId: mongoose.Types.ObjectId;
  planId: mongoose.Types.ObjectId;
  /** Sum of hoursBySport remaining (kept in step, for older screens). */
  hoursRemaining: number;
  /** Hours per sport (Phase 12). Empty on old one-pool memberships. */
  hoursBySport: { sport: string; total: number; remaining: number }[];
  guestPassesRemaining: number;
  validFrom: Date;
  validUntil: Date;
  status: UserMembershipStatus;
  /** What the customer paid for the plan (recorded by staff at activation). */
  pricePaid?: number | null;
  paymentMethod?: MembershipPaymentMethod | null;
  paymentNote?: string;
  activatedBy?: mongoose.Types.ObjectId | null;
  cancelledAt?: Date | null;
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
    hoursBySport: {
      type: [
        {
          _id: false,
          sport: { type: String, match: SPORT_CODE_RE, required: true },
          total: { type: Number, required: true, min: 0 },
          remaining: { type: Number, required: true, min: 0 },
        },
      ],
      default: [],
    },
    guestPassesRemaining: { type: Number, default: 0, min: 0 },
    validFrom: { type: Date, required: true },
    validUntil: { type: Date, required: true },
    status: {
      type: String,
      enum: ["active", "expired", "cancelled"],
      default: "active",
      index: true,
    },
    pricePaid: { type: Number, min: 0, default: null },
    paymentMethod: { type: String, enum: MEMBERSHIP_PAYMENT_METHODS, default: null },
    paymentNote: { type: String, trim: true, maxlength: 300, default: "" },
    activatedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    cancelledAt: { type: Date, default: null },
  },
  { timestamps: true },
);

UserMembershipSchema.index({ userId: 1, status: 1 });
UserMembershipSchema.index({ userId: 1, status: 1, validUntil: 1 });

const UserMembership: Model<IUserMembership> =
  mongoose.models.UserMembership ||
  mongoose.model<IUserMembership>("UserMembership", UserMembershipSchema);

export default UserMembership;
