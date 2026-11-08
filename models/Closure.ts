import mongoose, { Schema, Document, Model } from "mongoose";

/**
 * A time when courts can't be booked (maintenance, an event, a day off).
 * courtIds empty = every court. Deleting it opens the time again.
 */
export interface IClosure extends Document {
  courtIds: mongoose.Types.ObjectId[];
  startsAt: Date;
  endsAt: Date;
  /** For staff only. */
  reason: string;
  /** Shown to customers (app and website). */
  publicNote: string;
  createdBy?: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const ClosureSchema = new Schema(
  {
    courtIds: { type: [{ type: Schema.Types.ObjectId, ref: "Court" }], default: [] },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    reason: { type: String, required: true, trim: true, maxlength: 200 },
    publicNote: { type: String, default: "", trim: true, maxlength: 200 },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);

ClosureSchema.index({ endsAt: 1, startsAt: 1 });

const Closure: Model<IClosure> = mongoose.models.Closure || mongoose.model<IClosure>("Closure", ClosureSchema);

export default Closure;
