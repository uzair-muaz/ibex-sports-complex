import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import LoyaltyAccount from "@/models/LoyaltyAccount";
import LoyaltyTransaction from "@/models/LoyaltyTransaction";
import { getAppSettings } from "@/lib/app-settings";

/**
 * Give a brand-new customer the sign-up bonus from Admin → App Settings
 * (0 = off, the default). Only once per customer (unique record), and it
 * never makes sign-up fail. Deliberately NOT a "use server" file, so the
 * browser can't call it.
 */
export async function grantSignUpBonus(userId: string | mongoose.Types.ObjectId): Promise<number> {
  try {
    await connectDB();
    const { loyalty } = await getAppSettings();
    const points = Math.floor(loyalty.signUpBonusPoints);
    if (!(points > 0)) return 0;

    let txnId: mongoose.Types.ObjectId;
    try {
      const txn = await LoyaltyTransaction.create({
        userId,
        type: "bonus",
        points,
        balanceAfter: 0,
        note: "Welcome bonus",
      });
      txnId = txn._id as mongoose.Types.ObjectId;
    } catch (err) {
      if ((err as { code?: number }).code === 11000) return 0; // already given
      throw err;
    }
    const account = await LoyaltyAccount.findOneAndUpdate(
      { userId },
      { $inc: { balance: points }, $setOnInsert: { userId } },
      { upsert: true, new: true },
    );
    await LoyaltyTransaction.updateOne({ _id: txnId }, { $set: { balanceAfter: account.balance } });
    return points;
  } catch (err) {
    console.error("Sign-up bonus failed:", err);
    return 0;
  }
}
