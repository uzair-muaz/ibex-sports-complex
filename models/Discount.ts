import mongoose, { Schema, Document, Model } from "mongoose";
import { CourtType } from "./Court";

export type DiscountType = "percentage" | "fixed";

export interface IDiscount extends Document {
  name: string;
  type: DiscountType;
  value: number; // Percentage (e.g., 30 for 30%) or fixed amount in PKR
  courtTypes: CourtType[]; // Empty array means all courts
  allDay: boolean;
  startHour: number; // 0-23, only used if allDay is false
  endHour: number; // 0-23, only used if allDay is false
  validFrom: Date;
  validUntil: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const DiscountSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Discount name is required"],
      trim: true,
    },
    type: {
      type: String,
      enum: ["percentage", "fixed"],
      required: [true, "Discount type is required"],
    },
    value: {
      type: Number,
      required: [true, "Discount value is required"],
      min: [0.01, "Value must be greater than 0"],
      validate: {
        validator: function (this: IDiscount, v: number) {
          if (this.type === "percentage") {
            return v > 0 && v <= 100;
          }
          return v > 0;
        },
        message: "Percentage must be between 0 and 100, fixed amount must be positive",
      },
    },
    courtTypes: {
      type: [String],
      enum: ["PADEL", "CRICKET", "PICKLEBALL", "FUTSAL"],
      default: [], // Empty means all courts
    },
    allDay: {
      type: Boolean,
      default: true,
    },
    startHour: {
      type: Number,
      min: 0,
      max: 23,
      default: 0,
    },
    endHour: {
      type: Number,
      min: 0,
      max: 23,
      default: 23,
    },
    validFrom: {
      type: Date,
      required: [true, "Valid from date is required"],
    },
    validUntil: {
      type: Date,
      required: [true, "Valid until date is required"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Custom validation for date range
DiscountSchema.pre("save", function (next) {
  if (this.validFrom >= this.validUntil) {
    next(new Error("Valid until date must be after valid from date"));
  } else if (!this.allDay && this.startHour >= this.endHour) {
    next(new Error("End hour must be greater than start hour"));
  } else {
    next();
  }
});

// Index for efficient queries
DiscountSchema.index({ isActive: 1, validFrom: 1, validUntil: 1 });
DiscountSchema.index({ courtTypes: 1 });

const Discount: Model<IDiscount> =
  mongoose.models.Discount || mongoose.model<IDiscount>("Discount", DiscountSchema);

export default Discount;
