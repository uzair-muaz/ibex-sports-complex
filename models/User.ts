import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUser extends Document {
  email: string;
  password?: string;
  name: string;
  role: "super_admin" | "admin" | "user";
  image?: string;
  phone?: string;
  googleId?: string;
  appleId?: string;
  /** YYYY-MM-DD, optional (mobile profile). */
  dateOfBirth?: string | null;
  gender?: "male" | "female" | "unspecified" | null;
  city?: string | null;
  emailVerified?: Date | null;
  passwordResetTokenHash?: string | null;
  passwordResetExpires?: Date | null;
  /** Player preferences (lib/preferences.ts). */
  preferences?: {
    primarySport?: string | null;
    skillLevel?: string | null;
    hand?: string | null;
    courtSide?: string | null;
    notifications?: { matchReminders?: boolean; paymentUpdates?: boolean; courtAvailability?: boolean; newsletter?: boolean };
  };
  /** Blocked by the super admin: can't sign in or book. */
  blockedAt?: Date | null;
  blockedReason?: string | null;
  blockedBy?: mongoose.Types.ObjectId | null;
  /** Deleted by the customer (lib/account-deletion.ts): details are anonymized, sign-in refused. */
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: false,
      minlength: 6,
    },
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    role: {
      type: String,
      enum: ["super_admin", "admin", "user"],
      default: "user",
    },
    image: {
      type: String,
      required: false,
    },
    phone: {
      type: String,
      required: false,
      trim: true,
    },
    googleId: {
      type: String,
      required: false,
      sparse: true,
      unique: true,
    },
    /** Apple's user id ("sub"). Apple may hide the real email, so we link by this. */
    appleId: {
      type: String,
      required: false,
      sparse: true,
      unique: true,
    },
    dateOfBirth: { type: String, default: null, match: /^\d{4}-\d{2}-\d{2}$/ },
    gender: { type: String, enum: ["male", "female", "unspecified", null], default: null },
    city: { type: String, trim: true, maxlength: 60, default: null },
    emailVerified: {
      type: Date,
      required: false,
      default: null,
    },
    passwordResetTokenHash: {
      type: String,
      required: false,
      default: null,
      select: false,
    },
    passwordResetExpires: {
      type: Date,
      required: false,
      default: null,
      select: false,
    },
    // Player preferences (lib/preferences.ts). Missing values use the defaults there.
    preferences: {
      type: new Schema(
        {
          primarySport: { type: String, default: null },
          skillLevel: { type: String, default: null },
          hand: { type: String, default: null },
          courtSide: { type: String, default: null },
          notifications: {
            matchReminders: { type: Boolean },
            paymentUpdates: { type: Boolean },
            courtAvailability: { type: Boolean },
            newsletter: { type: Boolean },
          },
        },
        { _id: false },
      ),
      required: false,
    },
    // Blocked by the super admin (lib/customer-block.ts).
    blockedAt: { type: Date, default: null },
    blockedReason: { type: String, default: null, maxlength: 300 },
    blockedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  },
);

UserSchema.index({ createdAt: -1 });
UserSchema.index({ role: 1, name: 1 });
UserSchema.index({ blockedAt: 1 }, { partialFilterExpression: { blockedAt: { $type: "date" } } });

const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;
