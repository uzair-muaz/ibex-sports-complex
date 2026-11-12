import mongoose, { Schema, Document, Model } from "mongoose";
import { BROADCAST_AUDIENCES, BROADCAST_KINDS, type BroadcastAudience, type BroadcastKind } from "@/lib/broadcast-rules";

/** One message sent from Admin → Messages, and how far it got. */
export interface IBroadcast extends Document {
  title: string;
  body: string;
  kind: BroadcastKind;
  audience: BroadcastAudience;
  closureId?: mongoose.Types.ObjectId | null;
  email?: string | null;
  /** Customers who got it in the app's bell. */
  inAppCount: number;
  /** Phones it was pushed to (0 while push is switched off). */
  pushSent: number;
  /** Customers with the app who would get a push but push is switched off on this server. */
  pushLogged: number;
  /** Guest bookings in the closure (no account): call them. */
  guestBookings: number;
  sentBy?: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const BroadcastSchema = new Schema(
  {
    title: { type: String, required: true, maxlength: 80 },
    body: { type: String, required: true, maxlength: 500 },
    kind: { type: String, enum: BROADCAST_KINDS, required: true },
    audience: { type: String, enum: BROADCAST_AUDIENCES, required: true },
    closureId: { type: Schema.Types.ObjectId, ref: "Closure", default: null },
    email: { type: String, default: null },
    inAppCount: { type: Number, default: 0 },
    pushSent: { type: Number, default: 0 },
    pushLogged: { type: Number, default: 0 },
    guestBookings: { type: Number, default: 0 },
    sentBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);

BroadcastSchema.index({ createdAt: -1 });

const Broadcast: Model<IBroadcast> =
  mongoose.models.Broadcast || mongoose.model<IBroadcast>("Broadcast", BroadcastSchema);

export default Broadcast;
