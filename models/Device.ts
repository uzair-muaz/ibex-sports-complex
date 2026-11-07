import mongoose, { Schema, Document, Model } from "mongoose";

/** A phone that can get push notifications (Firebase token). */
export interface IDevice extends Document {
  userId: mongoose.Types.ObjectId;
  platform: "ios" | "android";
  pushToken: string;
  lastSeenAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DeviceSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    platform: { type: String, enum: ["ios", "android"], required: true },
    // One token belongs to one phone; if another account signs in on it, the token moves.
    pushToken: { type: String, required: true, unique: true, maxlength: 4096 },
    lastSeenAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

const Device: Model<IDevice> = mongoose.models.Device || mongoose.model<IDevice>("Device", DeviceSchema);

export default Device;
