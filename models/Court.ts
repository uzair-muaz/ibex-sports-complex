import mongoose, { Schema, Document, Model } from "mongoose";
import { COURT_FEATURE_KEYS, type CourtFeature } from "@/lib/court-features";

export type CourtType = "PADEL" | "CRICKET" | "PICKLEBALL" | "FUTSAL";

export { COURT_FEATURE_KEYS, type CourtFeature, type CourtFeatureKey } from "@/lib/court-features";

export interface ICourt extends Document {
  name: string;
  type: CourtType;
  image: string;
  description: string;
  pricePerHour: number; // 0 for free courts
  /** Saturday and Sunday price. Null = same as pricePerHour. */
  weekendPricePerHour?: number | null;
  isActive: boolean;
  /** Enable time-based peak/off-peak pricing */
  timeBasedPricingEnabled?: boolean;
  /** Optional list of peak/off-peak pricing periods */
  pricingPeriods?: {
    label: "off_peak" | "peak";
    startHour: number;
    endHour: number;
    pricePerHour: number;
    weekendPricePerHour?: number | null;
    allDay?: boolean;
  }[];
  /** Mobile app card details (all optional; the website ignores them). */
  surfaceLabel?: string;
  isIndoor?: boolean;
  hasRacketRental?: boolean;
  features?: CourtFeature[];
  highlight?: CourtFeature | null;
  createdAt: Date;
  updatedAt: Date;
}

const CourtFeatureSchema = new Schema(
  {
    key: { type: String, enum: COURT_FEATURE_KEYS, required: true },
    label: { type: String, required: true, trim: true, maxlength: 40 },
  },
  { _id: false },
);

const CourtSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Court name is required"],
      trim: true,
    },
    type: {
      type: String,
      enum: ["PADEL", "CRICKET", "PICKLEBALL", "FUTSAL"],
      required: [true, "Court type is required"],
    },
    image: {
      type: String,
      default: "", // Images are hardcoded in components, not stored in DB
    },
    description: {
      type: String,
      required: [true, "Court description is required"],
      trim: true,
    },
    pricePerHour: {
      type: Number,
      required: [true, "Price per hour is required"],
      min: 0,
      default: 0,
    },
    // Saturday and Sunday price. Null = same as pricePerHour.
    weekendPricePerHour: { type: Number, min: 0, default: null },
    isActive: {
      type: Boolean,
      default: true,
    },
    timeBasedPricingEnabled: {
      type: Boolean,
      default: false,
    },
    surfaceLabel: { type: String, trim: true, maxlength: 40, default: "" },
    isIndoor: { type: Boolean, default: false },
    hasRacketRental: { type: Boolean, default: false },
    features: { type: [CourtFeatureSchema], default: [] },
    highlight: { type: CourtFeatureSchema, default: null },
    pricingPeriods: [
      {
        label: {
          type: String,
          enum: ["off_peak", "peak"],
          required: true,
        },
        startHour: {
          type: Number,
          min: 0,
          max: 24,
          required: false,
        },
        endHour: {
          type: Number,
          min: 0,
          max: 24,
          required: false,
        },
        pricePerHour: {
          type: Number,
          min: 0,
          required: true,
        },
        weekendPricePerHour: { type: Number, min: 0, default: null },
        allDay: {
          type: Boolean,
          default: false,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Indexes for common court lookups
// - getCourts: { isActive: true, type?: ... } sorted by createdAt
CourtSchema.index({ type: 1, isActive: 1, createdAt: 1 });
CourtSchema.index({ isActive: 1, createdAt: 1 });
CourtSchema.index({ createdAt: 1 });

const Court: Model<ICourt> =
  mongoose.models.Court || mongoose.model<ICourt>("Court", CourtSchema);

export default Court;
