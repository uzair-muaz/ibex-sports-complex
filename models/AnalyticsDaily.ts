import mongoose, { Schema, Document, Model } from "mongoose";

export type AnalyticsCourtTypeBucket = {
  count: number;
  revenue: number;
};

export type AnalyticsDailyUserStat = {
  email: string;
  name: string;
  count: number;
  revenue: number;
};

export interface IAnalyticsDaily extends Document {
  /** Business date YYYY-MM-DD (unique). */
  date: string;
  totalBookings: number;
  confirmed: number;
  cancelled: number;
  completed: number;
  pendingPayment: number;
  /** Received cash on confirmed/completed bookings. */
  revenueCash: number;
  /** Received online on confirmed/completed bookings. */
  revenueOnline: number;
  /** Total received (cash+online, with amountPaid fallback). */
  revenueTotal: number;
  /** Count of confirmed+completed used for avg booking value. */
  revenueBookingsCount: number;
  byCourtType: Map<string, AnalyticsCourtTypeBucket> | Record<string, AnalyticsCourtTypeBucket>;
  /** Completed bookings that day, keyed for merge across ranges. */
  userStats: AnalyticsDailyUserStat[];
  rebuiltAt: Date;
}

const CourtTypeBucketSchema = new Schema(
  {
    count: { type: Number, default: 0 },
    revenue: { type: Number, default: 0 },
  },
  { _id: false },
);

const UserStatSchema = new Schema(
  {
    email: { type: String, required: true },
    name: { type: String, required: true },
    count: { type: Number, default: 0 },
    revenue: { type: Number, default: 0 },
  },
  { _id: false },
);

const AnalyticsDailySchema = new Schema<IAnalyticsDaily>(
  {
    date: {
      type: String,
      required: true,
      unique: true,
      match: [/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"],
    },
    totalBookings: { type: Number, default: 0 },
    confirmed: { type: Number, default: 0 },
    cancelled: { type: Number, default: 0 },
    completed: { type: Number, default: 0 },
    pendingPayment: { type: Number, default: 0 },
    revenueCash: { type: Number, default: 0 },
    revenueOnline: { type: Number, default: 0 },
    revenueTotal: { type: Number, default: 0 },
    revenueBookingsCount: { type: Number, default: 0 },
    byCourtType: {
      type: Map,
      of: CourtTypeBucketSchema,
      default: {},
    },
    userStats: { type: [UserStatSchema], default: [] },
    rebuiltAt: { type: Date, default: Date.now },
  },
  { timestamps: true, collection: "analytics_daily" },
);

const AnalyticsDaily: Model<IAnalyticsDaily> =
  mongoose.models.AnalyticsDaily ||
  mongoose.model<IAnalyticsDaily>("AnalyticsDaily", AnalyticsDailySchema);

export default AnalyticsDaily;
