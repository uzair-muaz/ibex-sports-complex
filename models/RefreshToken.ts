import mongoose, { Schema, Document, Model, Types } from "mongoose";

/**
 * Mobile refresh tokens. Only a SHA-256 hash of the token is stored,
 * so a database leak does not leak usable tokens.
 */
export interface IRefreshToken extends Document {
  userId: Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
  revokedAt?: Date | null;
  /** Set when this token was swapped for a new one by POST /auth/refresh. */
  replacedAt?: Date | null;
  userAgent?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const RefreshTokenSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    replacedAt: { type: Date, default: null },
    userAgent: { type: String, default: null, maxlength: 300 },
  },
  { timestamps: true },
);

// MongoDB deletes rows automatically 7 days after they expire.
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });

const RefreshToken: Model<IRefreshToken> =
  mongoose.models.RefreshToken ||
  mongoose.model<IRefreshToken>("RefreshToken", RefreshTokenSchema);

export default RefreshToken;
