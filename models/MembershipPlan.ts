import mongoose, { Schema, Document, Model } from "mongoose";
import type { CourtType } from "@/types";

export interface IMembershipPlan extends Document {
  slug: string;
  name: string;
  price: number;
  hours: number;
  weekdayOnly: boolean;
  guestPassesPerPeriod: number;
  priorityBadge: boolean;
  courtTypes: CourtType[];
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const MembershipPlanSchema = new Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    name: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    hours: { type: Number, required: true, min: 0 },
    weekdayOnly: { type: Boolean, default: false },
    guestPassesPerPeriod: { type: Number, default: 0, min: 0 },
    priorityBadge: { type: Boolean, default: false },
    courtTypes: {
      type: [String],
      enum: ["PADEL", "CRICKET", "PICKLEBALL", "FUTSAL"],
      default: ["PADEL", "CRICKET", "PICKLEBALL", "FUTSAL"],
    },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

const MembershipPlan: Model<IMembershipPlan> =
  mongoose.models.MembershipPlan ||
  mongoose.model<IMembershipPlan>("MembershipPlan", MembershipPlanSchema);

export default MembershipPlan;
