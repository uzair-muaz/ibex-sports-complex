import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type WalletTxnType = "credit" | "debit";
export type WalletTxnReason =
  | "booking_refund"
  | "late_payment_refund"
  | "booking_payment"
  | "admin_adjustment"
  /** Staff paid the customer's credit back to their bank (at the desk). */
  | "bank_payout"
  /** The customer deleted their account and chose to lose this credit. */
  | "account_deleted";

/** One change to a wallet. `refKey` makes each refund happen only once. */
export interface IWalletTransaction extends Document {
  userId: Types.ObjectId;
  type: WalletTxnType;
  /** Whole PKR, always positive; `type` says which way. */
  amount: number;
  balanceAfter: number | null;
  reason: WalletTxnReason;
  /** e.g. "cancel:<bookingId>" or "proof:<proofId>". Unique. */
  refKey: string;
  bookingId?: Types.ObjectId | null;
  note?: string | null;
  createdBy?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const WalletTransactionSchema = new Schema<IWalletTransaction>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: ["credit", "debit"], required: true },
    amount: { type: Number, required: true, min: 1 },
    balanceAfter: { type: Number, default: null },
    reason: {
      type: String,
      enum: ["booking_refund", "late_payment_refund", "booking_payment", "admin_adjustment", "bank_payout", "account_deleted"],
      required: true,
    },
    refKey: { type: String, required: true, unique: true },
    bookingId: { type: Schema.Types.ObjectId, ref: "Booking", default: null, index: true },
    note: { type: String, default: null, maxlength: 300 },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);

WalletTransactionSchema.index({ userId: 1, createdAt: -1 });

const WalletTransaction: Model<IWalletTransaction> =
  mongoose.models.WalletTransaction ||
  mongoose.model<IWalletTransaction>("WalletTransaction", WalletTransactionSchema);

export default WalletTransaction;
