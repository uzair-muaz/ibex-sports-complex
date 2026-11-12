import mongoose, { Schema, Document, Model } from "mongoose";

export type LoyaltyTxnType = "earn" | "redeem" | "refund" | "adjust" | "bonus";

export interface ILoyaltyTransaction extends Document {
  userId: mongoose.Types.ObjectId;
  type: LoyaltyTxnType;
  points: number;
  balanceAfter: number;
  bookingId?: mongoose.Types.ObjectId;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

const LoyaltyTransactionSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["earn", "redeem", "refund", "adjust", "bonus"],
      required: true,
    },
    points: { type: Number, required: true },
    balanceAfter: { type: Number, required: true, min: 0 },
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: "Booking",
      required: false,
      index: true,
    },
    note: { type: String, required: false },
  },
  { timestamps: true },
);

LoyaltyTransactionSchema.index(
  { bookingId: 1, type: 1 },
  {
    unique: true,
    partialFilterExpression: {
      bookingId: { $exists: true },
      type: "earn",
    },
  },
);

LoyaltyTransactionSchema.index(
  { bookingId: 1, type: 1 },
  {
    unique: true,
    partialFilterExpression: {
      bookingId: { $exists: true },
      type: "refund",
    },
    name: "bookingId_1_type_1_refund",
  },
);

// The sign-up bonus can only be given once per customer.
LoyaltyTransactionSchema.index(
  { userId: 1, type: 1 },
  { unique: true, partialFilterExpression: { type: "bonus" }, name: "userId_1_type_1_bonus" },
);

LoyaltyTransactionSchema.index({ userId: 1, createdAt: -1 });

const LoyaltyTransaction: Model<ILoyaltyTransaction> =
  mongoose.models.LoyaltyTransaction ||
  mongoose.model<ILoyaltyTransaction>(
    "LoyaltyTransaction",
    LoyaltyTransactionSchema,
  );

export default LoyaltyTransaction;
