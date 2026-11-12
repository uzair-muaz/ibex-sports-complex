import mongoose, { Schema, Document, Model, Types } from "mongoose";

/** A customer's IBEX wallet: PKR credit from refunds (Phase 11 adds spending it). */
export interface IWalletAccount extends Document {
  userId: Types.ObjectId;
  /** Whole PKR. Never below 0. */
  balance: number;
  createdAt: Date;
  updatedAt: Date;
}

const WalletAccountSchema = new Schema<IWalletAccount>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    balance: { type: Number, required: true, default: 0, min: 0 },
  },
  { timestamps: true },
);

const WalletAccount: Model<IWalletAccount> =
  mongoose.models.WalletAccount || mongoose.model<IWalletAccount>("WalletAccount", WalletAccountSchema);

export default WalletAccount;
