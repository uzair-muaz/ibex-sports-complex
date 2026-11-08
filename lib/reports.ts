/**
 * Admin → Reports: money, wallet, points, memberships and promo codes for a
 * date range, plus spreadsheet downloads. Server-only. Read-only.
 */
import connectDB from "@/lib/mongodb";
import Booking from "@/models/Booking";
import WalletAccount from "@/models/WalletAccount";
import WalletTransaction from "@/models/WalletTransaction";
import LoyaltyAccount from "@/models/LoyaltyAccount";
import LoyaltyTransaction from "@/models/LoyaltyTransaction";
import UserMembership from "@/models/UserMembership";
import PaymentProof from "@/models/PaymentProof";
import { getAppSettings } from "@/lib/app-settings";
import { PAYMENT_METHOD_LABELS, type MembershipPaymentMethod } from "@/lib/membership-payment";
import { bookingReference } from "@/lib/api/booking-view";
import { toPkIso } from "@/lib/api/time";
import {
  rangeMoments,
  summariseReportBookings,
  sumBy,
  toCsv,
  type ExportKind,
  type ReportBooking,
  type ReportRange,
} from "@/lib/report-rules";

/** Bookings whose game day is in the range (same as Analytics). */
function bookingsInRange(r: ReportRange) {
  return Booking.find({ date: { $gte: r.from, $lte: r.to } });
}

export async function buildReport(r: ReportRange) {
  await connectDB();
  const { start, end } = rangeMoments(r);
  const inRange = { createdAt: { $gte: start, $lt: end } };

  const [bookings, walletNow, walletTx, pointsNow, pointsTx, sales, activeMembers, settings] = await Promise.all([
    bookingsInRange(r)
      .select(
        "status source duration originalPrice discountAmount discounts promoCode promoDiscountPkr loyaltyDiscountPkr membershipDiscountPkr membershipHoursUsed totalPrice amountReceivedOnline amountReceivedCash amountPaid walletCreditUsed refundAmount refundPaidBackPkr courtId",
      )
      .populate("courtId", "type")
      .lean(),
    WalletAccount.aggregate<{ total: number; customers: number }>([
      { $match: { balance: { $gt: 0 } } },
      { $group: { _id: null, total: { $sum: "$balance" }, customers: { $sum: 1 } } },
    ]),
    WalletTransaction.find(inRange).select("type amount reason").lean(),
    LoyaltyAccount.aggregate<{ total: number; customers: number }>([
      { $match: { balance: { $gt: 0 } } },
      { $group: { _id: null, total: { $sum: "$balance" }, customers: { $sum: 1 } } },
    ]),
    LoyaltyTransaction.find(inRange).select("type points").lean(),
    UserMembership.find(inRange).select("planId pricePaid paymentMethod status").populate("planId", "name").lean(),
    UserMembership.countDocuments({ status: "active", validUntil: { $gt: new Date() } }),
    getAppSettings(),
  ]);

  const money = summariseReportBookings(
    bookings.map((b) => ({ ...(b as unknown as ReportBooking), sport: (b.courtId as unknown as { type?: string } | null)?.type ?? null })),
  );

  const credits = walletTx.filter((t) => t.type === "credit");
  const debits = walletTx.filter((t) => t.type === "debit");
  const pointsByType = sumBy(pointsTx, (t) => t.type, (t) => t.points);

  return {
    range: r,
    bookings: money,
    wallet: {
      /** Money customers hold right now (the venue owes this as future bookings). */
      balanceNow: walletNow[0]?.total ?? 0,
      customersWithBalance: walletNow[0]?.customers ?? 0,
      creditedTotal: credits.reduce((s, t) => s + t.amount, 0),
      debitedTotal: debits.reduce((s, t) => s + t.amount, 0),
      credited: sumBy(credits, (t) => t.reason, (t) => t.amount),
      debited: sumBy(debits, (t) => t.reason, (t) => t.amount),
    },
    points: {
      balanceNow: pointsNow[0]?.total ?? 0,
      customersWithPoints: pointsNow[0]?.customers ?? 0,
      pkrPerPoint: settings.loyalty.pkrPerPoint,
      byType: pointsByType,
    },
    memberships: {
      sold: sales.length,
      revenue: sales.reduce((s, m) => s + (m.pricePaid ?? 0), 0),
      activeNow: activeMembers,
      byPlan: sumBy(sales, (m) => (m.planId as unknown as { name?: string } | null)?.name ?? "Removed plan", (m) => m.pricePaid ?? 0),
      byMethod: sumBy(
        sales,
        (m) => (m.paymentMethod ? PAYMENT_METHOD_LABELS[m.paymentMethod as MembershipPaymentMethod] : "Not recorded"),
        (m) => m.pricePaid ?? 0,
      ),
    },
  };
}

export type Report = Awaited<ReturnType<typeof buildReport>>;

const MAX_ROWS = 20_000;

/** One spreadsheet (CSV) for the range. */
export async function buildExport(kind: ExportKind, r: ReportRange): Promise<{ filename: string; csv: string }> {
  await connectDB();
  const { start, end } = rangeMoments(r);
  const inRange = { createdAt: { $gte: start, $lt: end } };
  const filename = `ibex-${kind}-${r.from}-to-${r.to}.csv`;

  if (kind === "bookings") {
    const rows = await bookingsInRange(r).sort({ date: 1, startTime: 1 }).limit(MAX_ROWS).populate("courtId", "name type").lean();
    return {
      filename,
      csv: toCsv(
        ["Booking", "Game date", "Start (hour)", "Hours", "Court", "Sport", "Status", "From", "Customer", "Email", "Phone", "Court fee", "Auto discounts", "Promo code", "Promo off", "Points off", "Hours off", "Total", "Cash", "Online", "Paid (older, not split)", "Wallet used", "Still to pay", "Refund to wallet", "Paid back", "Made at"],
        rows.map((b) => {
          const court = b.courtId as unknown as { name?: string; type?: string } | null;
          const cash = b.amountReceivedCash ?? 0;
          const online = b.amountReceivedOnline ?? 0;
          const unsplit = cash + online === 0 ? (b.amountPaid ?? 0) : 0;
          const due = b.status === "cancelled" ? 0 : Math.max(0, (b.totalPrice ?? 0) - cash - online - unsplit - (b.walletCreditUsed ?? 0));
          return [
            bookingReference(b), b.date, b.startTime, b.duration, court?.name ?? "", court?.type ?? "", b.status, b.source ?? "web",
            b.userName, b.userEmail, b.userPhone, b.originalPrice, b.discountAmount ?? 0, b.promoCode ?? "", b.promoDiscountPkr ?? 0,
            b.loyaltyDiscountPkr ?? 0, b.membershipDiscountPkr ?? 0, b.totalPrice, cash, online, unsplit, b.walletCreditUsed ?? 0, due,
            b.refundAmount ?? 0, b.refundPaidBackPkr ?? 0, toPkIso(b.createdAt),
          ];
        }),
      ),
    };
  }

  if (kind === "payments") {
    const rows = await PaymentProof.find(inRange).sort({ createdAt: 1 }).limit(MAX_ROWS).populate("bookingId", "serialNumber userName userEmail").lean();
    return {
      filename,
      csv: toCsv(
        ["Sent at", "Booking", "Customer", "Email", "From", "Amount sent", "Status", "Amount confirmed", "Bank reference", "Reason (if rejected)", "Checked at"],
        rows.map((p) => {
          const b = p.bookingId as unknown as { _id: unknown; serialNumber?: number; userName?: string; userEmail?: string } | null;
          return [
            toPkIso(p.createdAt), b ? bookingReference(b as never) : "", b?.userName ?? "", b?.userEmail ?? "", p.source, p.amount, p.status,
            p.verifiedAmount ?? "", p.transferReference ?? "", p.rejectionReason ?? "", toPkIso(p.reviewedAt ?? null) ?? "",
          ];
        }),
      ),
    };
  }

  if (kind === "wallet") {
    const rows = await WalletTransaction.find(inRange).sort({ createdAt: 1 }).limit(MAX_ROWS).populate("userId", "name email").lean();
    return {
      filename,
      csv: toCsv(
        ["When", "Customer", "Email", "In / out", "Amount", "Why", "Balance after", "Note"],
        rows.map((t) => {
          const u = t.userId as unknown as { name?: string; email?: string } | null;
          return [toPkIso(t.createdAt), u?.name ?? "", u?.email ?? "", t.type === "credit" ? "In" : "Out", t.amount, t.reason, t.balanceAfter ?? "", t.note ?? ""];
        }),
      ),
    };
  }

  if (kind === "points") {
    const rows = await LoyaltyTransaction.find(inRange).sort({ createdAt: 1 }).limit(MAX_ROWS).populate("userId", "name email").lean();
    return {
      filename,
      csv: toCsv(
        ["When", "Customer", "Email", "Type", "Points", "Balance after", "Note"],
        rows.map((t) => {
          const u = t.userId as unknown as { name?: string; email?: string } | null;
          return [toPkIso(t.createdAt), u?.name ?? "", u?.email ?? "", t.type, t.points, t.balanceAfter, t.note ?? ""];
        }),
      ),
    };
  }

  const rows = await UserMembership.find(inRange)
    .sort({ createdAt: 1 })
    .limit(MAX_ROWS)
    .populate("userId", "name email phone")
    .populate("planId", "name price")
    .populate("activatedBy", "name")
    .lean();
  return {
    filename,
    csv: toCsv(
      ["Sold at", "Customer", "Email", "Phone", "Plan", "Plan price", "Paid", "Paid by", "Payment note", "Valid from", "Valid until", "Status", "Activated by"],
      rows.map((m) => {
        const u = m.userId as unknown as { name?: string; email?: string; phone?: string } | null;
        const p = m.planId as unknown as { name?: string; price?: number } | null;
        const by = m.activatedBy as unknown as { name?: string } | null;
        return [
          toPkIso(m.createdAt), u?.name ?? "", u?.email ?? "", u?.phone ?? "", p?.name ?? "", p?.price ?? "", m.pricePaid ?? "",
          m.paymentMethod ? PAYMENT_METHOD_LABELS[m.paymentMethod as MembershipPaymentMethod] : "", m.paymentNote ?? "",
          toPkIso(m.validFrom), toPkIso(m.validUntil), m.status, by?.name ?? "",
        ];
      }),
    ),
  };
}
