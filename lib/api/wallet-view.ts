import connectDB from "@/lib/mongodb";
import Booking from "@/models/Booking";
import WalletAccount from "@/models/WalletAccount";
import WalletTransaction, { type WalletTxnReason } from "@/models/WalletTransaction";
import { bookingReference } from "@/lib/api/booking-view";
import { decodeCursor, encodeCursor } from "@/lib/api/my-bookings";
import { toPkIso } from "@/lib/api/time";

export type WalletItemType = "refund" | "spent" | "adjustment";

export type WalletItem = {
  id: string;
  type: WalletItemType;
  /** + money in, − money out. */
  amount: number;
  title: string;
  bookingId: string | null;
  date: string | null;
};

const TYPE: Record<WalletTxnReason, WalletItemType> = {
  booking_refund: "refund",
  late_payment_refund: "refund",
  booking_payment: "spent",
  admin_adjustment: "adjustment",
  bank_payout: "adjustment",
};

export function mapWalletTxn(
  t: {
    _id: { toString(): string };
    type: "credit" | "debit";
    amount: number;
    reason: WalletTxnReason;
    bookingId?: { toString(): string } | null;
    note?: string | null;
    createdAt?: Date;
  },
  reference: string | null,
): WalletItem {
  const amount = t.type === "credit" ? t.amount : -t.amount;
  let title: string;
  switch (t.reason) {
    case "booking_refund":
      title = reference ? `Refund · ${reference}` : "Refund";
      break;
    case "late_payment_refund":
      title = reference ? `Late payment refund · ${reference}` : "Late payment refund";
      break;
    case "booking_payment":
      title = reference ? `Used for ${reference}` : "Used for a booking";
      break;
    case "bank_payout":
      title = "Paid out to your bank";
      break;
    default:
      title = t.note ? `Adjustment · ${t.note}` : amount >= 0 ? "Credit from IBEX" : "Adjustment";
  }
  return {
    id: t._id.toString(),
    type: TYPE[t.reason],
    amount,
    title,
    bookingId: t.bookingId ? t.bookingId.toString() : null,
    date: toPkIso(t.createdAt ?? null),
  };
}

/** Balance and history, newest first, in pages. null = bad cursor. */
export async function buildWallet(params: { userId: string; cursor?: string | null; limit?: number }) {
  const offset = decodeCursor(params.cursor);
  if (offset === null) return null;
  const limit = Math.min(50, Math.max(1, Math.floor(params.limit ?? 20)));
  await connectDB();
  const [account, txns, total] = await Promise.all([
    WalletAccount.findOne({ userId: params.userId }).select("balance").lean(),
    WalletTransaction.find({ userId: params.userId }).sort({ createdAt: -1, _id: -1 }).skip(offset).limit(limit).lean(),
    WalletTransaction.countDocuments({ userId: params.userId }),
  ]);
  const ids = txns.map((t) => t.bookingId).filter(Boolean);
  const bookings = ids.length ? await Booking.find({ _id: { $in: ids } }).select("serialNumber").lean() : [];
  const refs = new Map(bookings.map((b) => [b._id.toString(), bookingReference(b)]));
  return {
    balance: account?.balance ?? 0,
    history: {
      items: txns.map((t) => mapWalletTxn(t as never, t.bookingId ? (refs.get(t.bookingId.toString()) ?? null) : null)),
      nextCursor: offset + limit < total ? encodeCursor(offset + limit) : null,
    },
  };
}
