import mongoose, { Schema, Document, Model } from "mongoose";
import { CourtType } from "./Court";

export type DiscountType = "percentage" | "fixed";

export type DiscountPricingTier = "any" | "peak" | "off_peak";

export type DiscountCategory = "flat" | "time_based";

export type TierDiscountMode = "uniform" | "split";

export interface DiscountDayRule {
  days: number[];
  type: DiscountType;
  value: number;
}

export interface IDiscount extends Document {
  name: string;
  type: DiscountType;
  value: number; // Percentage (e.g., 30 for 30%) or fixed amount in PKR
  courtTypes: CourtType[]; // Empty array means all court types
  discountCategory: DiscountCategory;
  tierDiscountMode: TierDiscountMode;
  peakDiscount?: { type: DiscountType; value: number };
  offPeakDiscount?: { type: DiscountType; value: number };
  dayRules?: DiscountDayRule[];
  minBookingHours?: number;
  maxBookingHours?: number;
  pricingTier: DiscountPricingTier;
  allDay: boolean;
  startHour: number; // 0-23, only used if allDay is false
  endHour: number; // 0-23, only used if allDay is false
  validFrom: Date;
  validUntil: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TierSliceSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["percentage", "fixed"],
      required: true,
    },
    value: {
      type: Number,
      required: true,
      min: [0.01, "Tier slice value must be greater than 0"],
    },
  },
  { _id: false },
);

const DayRuleSchema = new Schema(
  {
    days: {
      type: [Number],
      required: true,
      validate: {
        validator: (v: number[]) =>
          Array.isArray(v) &&
          v.length > 0 &&
          v.every((d) => Number.isInteger(d) && d >= 0 && d <= 6),
        message: "Each day rule needs at least one valid day (0=Sun … 6=Sat)",
      },
    },
    type: {
      type: String,
      enum: ["percentage", "fixed"],
      required: true,
    },
    value: {
      type: Number,
      required: true,
      min: [0.01, "Day rule value must be greater than 0"],
    },
  },
  { _id: false },
);

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
      default: [], // Empty means all court types
    },
    discountCategory: {
      type: String,
      enum: ["flat", "time_based"],
      default: "flat",
    },
    tierDiscountMode: {
      type: String,
      enum: ["uniform", "split"],
      default: "uniform",
    },
    peakDiscount: {
      type: TierSliceSchema,
      required: false,
    },
    offPeakDiscount: {
      type: TierSliceSchema,
      required: false,
    },
    dayRules: {
      type: [DayRuleSchema],
      default: undefined,
    },
    minBookingHours: {
      type: Number,
      min: 0.5,
    },
    maxBookingHours: {
      type: Number,
      min: 0.5,
    },
    pricingTier: {
      type: String,
      enum: ["any", "peak", "off_peak"],
      default: "any",
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

DiscountSchema.pre("validate", function (this: IDiscount, next) {
  const cat = this.discountCategory ?? "flat";
  const mode = this.tierDiscountMode ?? "uniform";
  const dayRules = Array.isArray(this.dayRules)
    ? this.dayRules.filter((r) => r && r.days?.length > 0 && r.value > 0)
    : [];
  const hasDayRules = dayRules.length > 0;

  if (hasDayRules && mode === "split") {
    next(new Error("Day-based rates cannot be combined with peak/off-peak split"));
    return;
  }

  if (hasDayRules) {
    const seen = new Set<number>();
    for (const rule of dayRules) {
      if (rule.type === "percentage" && rule.value > 100) {
        next(new Error("Day rule percentage must be at most 100"));
        return;
      }
      for (const d of rule.days) {
        if (seen.has(d)) {
          next(new Error("Each day of the week can only appear in one day rule"));
          return;
        }
        seen.add(d);
      }
    }
    const first = dayRules[0];
    if (first) {
      (this as unknown as { type: DiscountType }).type = first.type;
      (this as unknown as { value: number }).value = first.value;
    }
  }

  const pv =
    this.peakDiscount &&
    typeof this.peakDiscount.value === "number" &&
    this.peakDiscount.value > 0;
  const ov =
    this.offPeakDiscount &&
    typeof this.offPeakDiscount.value === "number" &&
    this.offPeakDiscount.value > 0;

  if (cat === "time_based" && mode === "split") {
    if (!pv && !ov) {
      next(new Error("Add a peak and/or off-peak discount amount"));
      return;
    }
    if (!this.type) {
      (this as unknown as { type: DiscountType }).type = "percentage";
    }
    if (this.value == null || this.value <= 0) {
      (this as unknown as { value: number }).value = 0.01;
    }
    if (this.peakDiscount?.type === "percentage" && this.peakDiscount.value > 100) {
      next(new Error("Peak percentage must be at most 100"));
      return;
    }
    if (this.offPeakDiscount?.type === "percentage" && this.offPeakDiscount.value > 100) {
      next(new Error("Off-peak percentage must be at most 100"));
      return;
    }
  } else if (cat === "time_based" && mode === "uniform") {
    if (!hasDayRules && (this.value == null || this.value <= 0)) {
      next(new Error("Discount value is required for uniform time-based discount"));
      return;
    }
  } else {
    if (!hasDayRules && (this.value == null || this.value <= 0)) {
      next(new Error("Discount value is required"));
      return;
    }
  }

  if (
    !hasDayRules &&
    this.type === "percentage" &&
    this.value != null &&
    this.value > 100
  ) {
    next(new Error("Percentage must be at most 100"));
    return;
  }

  next();
});

// Custom validation for date range
DiscountSchema.pre("save", function (this: IDiscount, next) {
  if (this.validFrom >= this.validUntil) {
    next(new Error("Valid until date must be after valid from date"));
    return;
  }
  if (!this.allDay && this.startHour >= this.endHour) {
    next(new Error("End hour must be greater than start hour"));
    return;
  }
  const minH = this.minBookingHours;
  const maxH = this.maxBookingHours;
  if (minH != null) {
    if (minH <= 0 || minH % 0.5 !== 0) {
      next(new Error("Minimum booking hours must be a positive multiple of 0.5"));
      return;
    }
  }
  if (maxH != null) {
    if (maxH <= 0 || maxH % 0.5 !== 0) {
      next(new Error("Maximum booking hours must be a positive multiple of 0.5"));
      return;
    }
  }
  if (minH != null && maxH != null && minH > maxH) {
    next(new Error("Minimum booking hours cannot exceed maximum"));
    return;
  }
  next();
});

// Index for efficient queries
DiscountSchema.index({ isActive: 1, validFrom: 1, validUntil: 1 });
// Helps admin listing + active discount fetch sorted by createdAt
DiscountSchema.index({ isActive: 1, createdAt: -1 });
DiscountSchema.index({ createdAt: -1 });
DiscountSchema.index({ courtTypes: 1 });

if (mongoose.models.Discount) {
  delete mongoose.models.Discount;
}

const Discount: Model<IDiscount> = mongoose.model<IDiscount>("Discount", DiscountSchema);

export default Discount;
