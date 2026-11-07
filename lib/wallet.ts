import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import WalletAccount from "@/models/WalletAccount";
import WalletTransaction, { type WalletTxnReason } from "@/models/WalletTransaction";

/**
 * Add PKR credit to a customer's wallet, exactly once per `refKey`.
 * Step 1 writes the record (the unique refKey stops a second one); step 2
 * adds to the balance in one database step. If step 2 fails, step 1 is undone.
 */
export async function creditWallet(params: {
  userId: string | mongoose.Types.ObjectId;
  amount: number;
  reason: WalletTxnReason;
  refKey: string;
  bookingId?: string | mongoose.Types.ObjectId | null;
  note?: string | null;
  createdBy?: string | null;
}): Promise<{ credited: boolean; balance: number | null }> {
  const amount = Math.round(params.amount);
  if (!(amount > 0)) return { credited: false, balance: null };
  await connectDB();

  let txnId: mongoose.Types.ObjectId;
  try {
    const txn = await WalletTransaction.create({
      userId: params.userId,
      type: "credit",
      amount,
      reason: params.reason,
      refKey: params.refKey,
      bookingId: params.bookingId ?? null,
      note: params.note ?? null,
      createdBy: params.createdBy ?? null,
    });
    txnId = txn._id as mongoose.Types.ObjectId;
  } catch (err) {
    if ((err as { code?: number }).code === 11000) return { credited: false, balance: null };
    throw err;
  }

  try {
    const account = await WalletAccount.findOneAndUpdate(
      { userId: params.userId },
      { $inc: { balance: amount }, $setOnInsert: { userId: params.userId } },
      { upsert: true, new: true },
    );
    await WalletTransaction.updateOne({ _id: txnId }, { $set: { balanceAfter: account.balance } });
    return { credited: true, balance: account.balance };
  } catch (err) {
    await WalletTransaction.deleteOne({ _id: txnId }).catch(() => {});
    throw err;
  }
}

export async function walletBalance(userId: string): Promise<number> {
  await connectDB();
  const acc = await WalletAccount.findOne({ userId }).select("balance").lean();
  return acc?.balance ?? 0;
}
