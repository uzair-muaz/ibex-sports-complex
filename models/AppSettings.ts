import mongoose, { Schema, Document, Model } from "mongoose";

/**
 * One row (key "main") of settings the super admin edits: venue contacts,
 * per-sport booking rules for the app, and the cancellation notice.
 * Anything missing falls back to the defaults in lib/app-settings.ts.
 */
export type SportKey = "PADEL" | "PICKLEBALL" | "FUTSAL" | "CRICKET";

export interface ISportSetting {
  sport: SportKey;
  label?: string;
  showInApp?: boolean;
  imageUrl?: string;
  badge?: string | null;
  durationsMinutes?: number[];
  defaultDurationMinutes?: number;
  bookingWindowDays?: number;
  sortOrder?: number;
}

export interface IVenueSetting {
  name?: string;
  branchName?: string;
  hoursLabel?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  whatsApp?: string;
  email?: string;
  facilityNote?: string | null;
  weatherSummary?: string | null;
}

export interface ILoyaltySetting {
  /** "per_pkr": earnPoints for every earnPerPkr spent. "per_hour": earnPoints per hour played. */
  earnBasis?: "per_pkr" | "per_hour";
  earnPoints?: number;
  earnPerPkr?: number;
  minRedeemPoints?: number;
  /** Most of the court fee points can pay, in % (100 = all of it). */
  maxRedeemPercent?: number;
  pkrPerPoint?: number;
  signUpBonusPoints?: number;
  /** Earn points on the part paid with membership hours too. */
  earnOnMembershipHours?: boolean;
}

export interface IPaymentSetting {
  minAdvancePercent?: number;
  bankAccounts?: { bankName: string; accountTitle: string; accountNumber: string; iban?: string | null }[];
  transferNote?: string;
  verificationNote?: string;
  balanceNote?: string;
}

export interface IAppSettings extends Document {
  key: string;
  venue?: IVenueSetting;
  sports?: ISportSetting[];
  cancellationNoticeMinutes?: number;
  loyalty?: ILoyaltySetting;
  payments?: IPaymentSetting;
  /** Membership rules (lib/app-settings.ts MembershipRules). */
  membership?: { weekdayAdvanceHours?: number; weekendAdvanceHours?: number; carryOverGraceDays?: number };
  /** Support FAQs. Empty/missing = the built-in ones (lib/faqs.ts). */
  faqs?: { question: string; answer: string }[] | null;
  updatedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const SportSettingSchema = new Schema<ISportSetting>(
  {
    sport: { type: String, enum: ["PADEL", "PICKLEBALL", "FUTSAL", "CRICKET"], required: true },
    label: { type: String, trim: true, maxlength: 40 },
    showInApp: { type: Boolean },
    imageUrl: { type: String, trim: true, maxlength: 1000 },
    badge: { type: String, trim: true, maxlength: 30, default: null },
    durationsMinutes: [{ type: Number, min: 30, max: 720 }],
    defaultDurationMinutes: { type: Number, min: 30, max: 720 },
    bookingWindowDays: { type: Number, min: 1, max: 365 },
    sortOrder: { type: Number },
  },
  { _id: false },
);

const VenueSettingSchema = new Schema<IVenueSetting>(
  {
    name: { type: String, trim: true, maxlength: 80 },
    branchName: { type: String, trim: true, maxlength: 80 },
    hoursLabel: { type: String, trim: true, maxlength: 80 },
    address: { type: String, trim: true, maxlength: 300 },
    latitude: { type: Number, min: -90, max: 90 },
    longitude: { type: Number, min: -180, max: 180 },
    phone: { type: String, trim: true, maxlength: 30 },
    whatsApp: { type: String, trim: true, maxlength: 30 },
    email: { type: String, trim: true, maxlength: 120 },
    facilityNote: { type: String, trim: true, maxlength: 120, default: null },
    weatherSummary: { type: String, trim: true, maxlength: 60, default: null },
  },
  { _id: false },
);

const LoyaltySettingSchema = new Schema<ILoyaltySetting>(
  {
    earnBasis: { type: String, enum: ["per_pkr", "per_hour"] },
    earnPoints: { type: Number, min: 0, max: 10000 },
    earnPerPkr: { type: Number, min: 1, max: 100000 },
    minRedeemPoints: { type: Number, min: 0, max: 1000000 },
    maxRedeemPercent: { type: Number, min: 0, max: 100 },
    pkrPerPoint: { type: Number, min: 0.01, max: 1000 },
    signUpBonusPoints: { type: Number, min: 0, max: 100000 },
    earnOnMembershipHours: { type: Boolean },
  },
  { _id: false },
);

const PaymentSettingSchema = new Schema<IPaymentSetting>(
  {
    minAdvancePercent: { type: Number, min: 0, max: 100 },
    bankAccounts: {
      type: [
        {
          _id: false,
          bankName: { type: String, required: true },
          accountTitle: { type: String, required: true },
          accountNumber: { type: String, required: true },
          iban: { type: String, default: null },
        },
      ],
      default: undefined,
    },
    transferNote: { type: String },
    verificationNote: { type: String },
    balanceNote: { type: String },
  },
  { _id: false },
);

const AppSettingsSchema = new Schema<IAppSettings>(
  {
    key: { type: String, required: true, unique: true, default: "main" },
    venue: { type: VenueSettingSchema, default: undefined },
    sports: { type: [SportSettingSchema], default: undefined },
    cancellationNoticeMinutes: { type: Number, min: 0, max: 10080 },
    loyalty: { type: LoyaltySettingSchema, default: undefined },
    payments: { type: PaymentSettingSchema, default: undefined },
    membership: {
      type: new Schema(
        {
          weekdayAdvanceHours: { type: Number, min: 0, max: 168 },
          weekendAdvanceHours: { type: Number, min: 0, max: 168 },
          carryOverGraceDays: { type: Number, min: 0, max: 90 },
        },
        { _id: false },
      ),
      default: undefined,
    },
    faqs: {
      type: [{ _id: false, question: { type: String, required: true }, answer: { type: String, required: true } }],
      default: undefined,
    },
    updatedBy: { type: String, default: null },
  },
  { timestamps: true },
);

const AppSettings: Model<IAppSettings> =
  mongoose.models.AppSettings ||
  mongoose.model<IAppSettings>("AppSettings", AppSettingsSchema);

export default AppSettings;
