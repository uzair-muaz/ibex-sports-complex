import connectDB from "@/lib/mongodb";
import Booking from "@/models/Booking";
import LoyaltyAccount from "@/models/LoyaltyAccount";
import LoyaltyTransaction, { type LoyaltyTxnType } from "@/models/LoyaltyTransaction";
import { getAppSettings, type LoyaltyRules } from "@/lib/app-settings";
import { pointsEarnedFor } from "@/lib/loyalty-rules";
import { bookingReference, bookingStartMs } from "@/lib/api/booking-view";
import { decodeCursor, encodeCursor } from "@/lib/api/my-bookings";
import { toPkIso } from "@/lib/api/time";

export type AppPointsType = "earned" | "redeemed" | "returned" | "bonus" | "adjusted";
export type AppPointsStatus = "pending" | "completed" | "applied";

export type AppPointsItem = {
  id: string;
  type: AppPointsType;
  status: AppPointsStatus;
  /** Signed: + added to the balance, − taken from it. */
  points: number;
  title: string;
  bookingId: string | null;
  date: string | null;
};

const TYPE_MAP: Record<LoyaltyTxnType, { type: AppPointsType; status: AppPointsStatus }> = {
  earn: { type: "earned", status: "completed" },
  redeem: { type: "redeemed", status: "applied" },
  refund: { type: "returned", status: "completed" },
  bonus: { type: "bonus", status: "completed" },
  adjust: { type: "adjusted", status: "completed" },
};

const TITLES: Record<AppPointsType, string> = {
  earned: "Points earned",
  redeemed: "Points used",
  returned: "Points returned",
  bonus: "Welcome bonus",
  adjusted: "Adjusted by IBEX",
};

export function mapTransaction(
  t: { _id: { toString(): string }; type: LoyaltyTxnType; points: number; bookingId?: { toString(): string } | null; createdAt?: Date },
  bookingTitle: string | null,
): AppPointsItem {
  const m = TYPE_MAP[t.type];
  return {
    id: t._id.toString(),
    type: m.type,
    status: m.status,
    points: t.points,
    title: bookingTitle ? `${TITLES[m.type]} · ${bookingTitle}` : TITLES[m.type],
    bookingId: t.bookingId ? t.bookingId.toString() : null,
    date: toPkIso(t.createdAt ?? null),
  };
}

export function publicRules(r: LoyaltyRules) {
  return {
    earnBasis: r.earnBasis,
    earnPoints: r.earnPoints,
    earnPerPkr: r.earnPerPkr,
    minRedeemPoints: r.minRedeemPoints,
    maxRedeemPercent: r.maxRedeemPercent,
    signUpBonusPoints: r.signUpBonusPoints,
    earnOnMembershipHours: r.earnOnMembershipHours,
  };
}

type BookingRow = {
  _id: { toString(): string };
  serialNumber?: number | null;
  date: string;
  startTime: number;
  duration: number;
  totalPrice: number;
  usedMembershipHours?: boolean;
  courtId?: { type?: string } | null;
};

/**
 * The app's Rewards tab. Pending points (bookings not played yet) come first
 * on the first page; then the history, newest first, in pages.
 */
export async function buildAppLoyalty(params: { userId: string; cursor?: string | null; limit?: number }) {
  const offset = decodeCursor(params.cursor);
  if (offset === null) return null;
  const limit = Math.min(50, Math.max(1, Math.floor(params.limit ?? 20)));

  await connectDB();
  const settings = await getAppSettings();
  const rules = settings.loyalty;
  const sportLabel = (type?: string) => settings.sports.find((s) => s.sport === type)?.label ?? "Court";
  const titleFor = (b: BookingRow) => `${sportLabel(b.courtId?.type)} match · ${bookingReference(b)}`;

  const [account, upcoming, txns, total] = await Promise.all([
    LoyaltyAccount.findOne({ userId: params.userId }).select("balance").lean(),
    // Points are credited when staff mark the booking completed; until then they are pending.
    Booking.find({ userId: params.userId, status: { $in: ["pending_payment", "confirmed"] } })
      .select("serialNumber date startTime duration totalPrice usedMembershipHours courtId")
      .populate("courtId", "type")
      .lean(),
    LoyaltyTransaction.find({ userId: params.userId }).sort({ createdAt: -1, _id: -1 }).skip(offset).limit(limit).lean(),
    LoyaltyTransaction.countDocuments({ userId: params.userId }),
  ]);

  const pendingItems: AppPointsItem[] = (upcoming as unknown as BookingRow[])
    .map((b) => ({
      b,
      points: pointsEarnedFor(rules, {
        paidTotal: b.totalPrice,
        durationMinutes: Math.round(b.duration * 60),
        usedMembershipHours: !!b.usedMembershipHours,
      }),
    }))
    .filter((x) => x.points > 0)
    .sort((x, y) => bookingStartMs(x.b.date, x.b.startTime) - bookingStartMs(y.b.date, y.b.startTime))
    .map(({ b, points }) => ({
      id: `pending:${b._id.toString()}`,
      type: "earned" as const,
      status: "pending" as const,
      points,
      title: titleFor(b),
      bookingId: b._id.toString(),
      // When the match ends.
      date: toPkIso(bookingStartMs(b.date, b.startTime) + b.duration * 3_600_000),
    }));

  const bookingIds = txns.map((t) => t.bookingId).filter(Boolean);
  const bookings = bookingIds.length
    ? ((await Booking.find({ _id: { $in: bookingIds } })
        .select("serialNumber date startTime duration totalPrice courtId")
        .populate("courtId", "type")
        .lean()) as unknown as BookingRow[])
    : [];
  const byId = new Map(bookings.map((b) => [b._id.toString(), b]));
  const historyItems = txns.map((t) => {
    const b = t.bookingId ? byId.get(t.bookingId.toString()) : undefined;
    return mapTransaction(t as never, b ? titleFor(b) : null);
  });

  return {
    points: account?.balance ?? 0,
    pendingPoints: pendingItems.reduce((sum, i) => sum + i.points, 0),
    pkrPerPoint: rules.pkrPerPoint,
    rules: publicRules(rules),
    history: {
      items: offset === 0 ? [...pendingItems, ...historyItems] : historyItems,
      nextCursor: offset + limit < total ? encodeCursor(offset + limit) : null,
    },
  };
}
