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
    const { notifyWalletCredited } = await import("@/lib/notifications/events");
    await notifyWalletCredited({
      userId: params.userId,
      amount,
      balance: account.balance,
      refKey: params.refKey,
      bookingId: params.bookingId ?? null,
    });
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

/**
 * Take PKR credit from a wallet, exactly once per `refKey`, never below 0.
 * Step 1 writes the record (unique refKey); step 2 takes the money only if
 * the balance is enough (one database step). If step 2 can't, step 1 is undone.
 */
export async function debitWallet(params: {
  userId: string | mongoose.Types.ObjectId;
  amount: number;
  reason: WalletTxnReason;
  refKey: string;
  bookingId?: string | mongoose.Types.ObjectId | null;
  note?: string | null;
  createdBy?: string | null;
}): Promise<{ ok: true; balance: number } | { ok: false; code: "INSUFFICIENT_BALANCE" | "DUPLICATE" }> {
  const amount = Math.round(params.amount);
  if (!(amount > 0)) throw new Error("amount must be positive");
  await connectDB();

  let txnId: mongoose.Types.ObjectId;
  try {
    const txn = await WalletTransaction.create({
      userId: params.userId,
      type: "debit",
      amount,
      reason: params.reason,
      refKey: params.refKey,
      bookingId: params.bookingId ?? null,
      note: params.note ?? null,
      createdBy: params.createdBy ?? null,
    });
    txnId = txn._id as mongoose.Types.ObjectId;
  } catch (err) {
    if ((err as { code?: number }).code === 11000) return { ok: false, code: "DUPLICATE" };
    throw err;
  }

  try {
    const account = await WalletAccount.findOneAndUpdate(
      { userId: params.userId, balance: { $gte: amount } },
      { $inc: { balance: -amount } },
      { new: true },
    );
    if (!account) {
      await WalletTransaction.deleteOne({ _id: txnId });
      return { ok: false, code: "INSUFFICIENT_BALANCE" };
    }
    await WalletTransaction.updateOne({ _id: txnId }, { $set: { balanceAfter: account.balance } });
    return { ok: true, balance: account.balance };
  } catch (err) {
    await WalletTransaction.deleteOne({ _id: txnId }).catch(() => {});
    throw err;
  }
}

/** Undo a debit that was made for something that then failed (e.g. a booking that couldn't be saved). */
export async function undoWalletDebit(refKey: string): Promise<void> {
  await connectDB();
  const txn = await WalletTransaction.findOneAndDelete({ refKey, type: "debit" });
  if (txn) {
    await WalletAccount.updateOne({ userId: txn.userId }, { $inc: { balance: txn.amount } });
  }
}
