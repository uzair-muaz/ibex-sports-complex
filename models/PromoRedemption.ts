import mongoose, { Schema, Document, Model } from "mongoose";

/** One promo code used on one booking. "released" when the booking was cancelled. */
export interface IPromoRedemption extends Document {
  promoId: mongoose.Types.ObjectId;
  code: string;
  bookingId: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId | null;
  email: string;
  discountPkr: number;
  status: "used" | "released";
  createdAt: Date;
  updatedAt: Date;
}

const PromoRedemptionSchema = new Schema(
  {
    promoId: { type: Schema.Types.ObjectId, ref: "PromoCode", required: true, index: true },
    code: { type: String, required: true },
    bookingId: { type: Schema.Types.ObjectId, ref: "Booking", required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    email: { type: String, required: true, lowercase: true, trim: true },
    discountPkr: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ["used", "released"], default: "used" },
  },
  { timestamps: true },
);

PromoRedemptionSchema.index({ promoId: 1, userId: 1, status: 1 });
PromoRedemptionSchema.index({ promoId: 1, email: 1, status: 1 });

const PromoRedemption: Model<IPromoRedemption> =
  mongoose.models.PromoRedemption || mongoose.model<IPromoRedemption>("PromoRedemption", PromoRedemptionSchema);

export default PromoRedemption;
