import mongoose, { Schema, Document, Model } from "mongoose";

export interface ILoyaltyAccount extends Document {
  userId: mongoose.Types.ObjectId;
  balance: number;
  createdAt: Date;
  updatedAt: Date;
}

const LoyaltyAccountSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    balance: { type: Number, required: true, default: 0, min: 0 },
  },
  { timestamps: true },
);

const LoyaltyAccount: Model<ILoyaltyAccount> =
  mongoose.models.LoyaltyAccount ||
  mongoose.model<ILoyaltyAccount>("LoyaltyAccount", LoyaltyAccountSchema);

export default LoyaltyAccount;
