import mongoose, { Schema, Document, Model } from "mongoose";
import { PROMO_SPORTS } from "@/lib/promo-rules";

export interface IPromoCode extends Document {
  code: string;
  description: string;
  type: "percentage" | "fixed";
  value: number;
  maxDiscountPkr?: number | null;
  minFeePkr?: number | null;
  sports: string[];
  validFrom?: Date | null;
  validUntil?: Date | null;
  maxUses?: number | null;
  maxUsesPerCustomer: number;
  newCustomersOnly: boolean;
  isActive: boolean;
  /** Uses on bookings that weren't cancelled. */
  usedCount: number;
  createdBy?: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const PromoCodeSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, maxlength: 20 },
    description: { type: String, trim: true, maxlength: 120, default: "" },
    type: { type: String, enum: ["percentage", "fixed"], required: true },
    value: { type: Number, required: true, min: 1 },
    maxDiscountPkr: { type: Number, min: 1, default: null },
    minFeePkr: { type: Number, min: 1, default: null },
    sports: { type: [{ type: String, enum: PROMO_SPORTS }], default: [] },
    validFrom: { type: Date, default: null },
    validUntil: { type: Date, default: null },
    maxUses: { type: Number, min: 1, default: null },
    maxUsesPerCustomer: { type: Number, min: 0, default: 1 },
    newCustomersOnly: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    usedCount: { type: Number, min: 0, default: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);

const PromoCode: Model<IPromoCode> =
  mongoose.models.PromoCode || mongoose.model<IPromoCode>("PromoCode", PromoCodeSchema);

export default PromoCode;
