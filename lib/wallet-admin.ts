import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { creditWallet, debitWallet } from "@/lib/wallet";
import { isStaffRole } from "@/lib/authz";

export type StaffWalletAction = "credit" | "debit" | "bank_payout";

/**
 * Staff change a customer's wallet. `requestId` comes from the staff screen
 * (one per open form), so a double click can't apply it twice.
 */
export async function staffWalletChange(params: {
  userId: unknown;
  action: unknown;
  amount: unknown;
  note: unknown;
  requestId: unknown;
  staffId: string;
}): Promise<{ ok: true; balance: number } | { ok: false; status: number; code: string; error: string }> {
  const bad = (error: string, code = "VALIDATION_ERROR", status = 400) => ({ ok: false as const, status, code, error });
  const action = params.action as StaffWalletAction;
  if (!["credit", "debit", "bank_payout"].includes(action)) return bad("action must be credit, debit or bank_payout.");
  const amount = typeof params.amount === "number" ? Math.round(params.amount) : NaN;
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000) return bad("Enter an amount in whole PKR.");
  const note = typeof params.note === "string" ? params.note.trim() : "";
  if (note.length < 3 || note.length > 300) return bad("Please write a short reason (3–300 characters).");
  if (typeof params.requestId !== "string" || !/^[A-Za-z0-9-]{8,64}$/.test(params.requestId)) {
    return bad("requestId is missing.");
  }
  if (typeof params.userId !== "string" || !mongoose.isValidObjectId(params.userId)) {
    return bad("Customer not found", "USER_NOT_FOUND", 404);
  }
  await connectDB();
  const user = await User.findById(params.userId).select("role").lean();
  if (!user || isStaffRole(user.role)) return bad("Customer not found", "USER_NOT_FOUND", 404);

  const refKey = `staff:${params.requestId}`;
  if (action === "credit") {
    const res = await creditWallet({
      userId: params.userId,
      amount,
      reason: "admin_adjustment",
      refKey,
      note,
      createdBy: params.staffId,
    });
    if (!res.credited) return bad("This change was already saved.", "DUPLICATE", 409);
    return { ok: true, balance: res.balance ?? 0 };
  }
  const res = await debitWallet({
    userId: params.userId,
    amount,
    reason: action === "bank_payout" ? "bank_payout" : "admin_adjustment",
    refKey,
    note,
    createdBy: params.staffId,
  });
  if (!res.ok) {
    return res.code === "DUPLICATE"
      ? bad("This change was already saved.", "DUPLICATE", 409)
      : bad("The wallet doesn't have that much credit.", "INSUFFICIENT_BALANCE", 409);
  }
  return { ok: true, balance: res.balance };
}
