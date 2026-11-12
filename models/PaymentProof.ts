import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type PaymentProofStatus = "submitted" | "verified" | "rejected";

/**
 * A bank-transfer screenshot for a booking (from the app, or added by staff
 * from WhatsApp). Staff check it by hand: verified amounts add up on the booking.
 */
export interface IPaymentProof extends Document {
  bookingId: Types.ObjectId;
  /** Who sent it (null for guests and for staff-added WhatsApp proofs). */
  userId?: Types.ObjectId | null;
  source: "app" | "whatsapp";
  /** Amount the customer says they sent, whole PKR. */
  amount: number;
  transferReference?: string | null;
  transferredAt?: Date | null;
  status: PaymentProofStatus;
  /** Amount staff actually confirmed (may differ from `amount`). */
  verifiedAmount?: number | null;
  rejectionReason?: string | null;
  reviewedBy?: Types.ObjectId | null;
  reviewedAt?: Date | null;
  note?: string | null;
  /** Private storage key; null when staff added a WhatsApp payment without a file. */
  fileKey?: string | null;
  fileType?: "jpg" | "png" | "pdf" | null;
  fileSize?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentProofSchema = new Schema<IPaymentProof>(
  {
    bookingId: { type: Schema.Types.ObjectId, ref: "Booking", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    source: { type: String, enum: ["app", "whatsapp"], required: true },
    amount: { type: Number, required: true, min: 0 },
    transferReference: { type: String, default: null, maxlength: 100 },
    transferredAt: { type: Date, default: null },
    status: { type: String, enum: ["submitted", "verified", "rejected"], default: "submitted", index: true },
    verifiedAmount: { type: Number, default: null, min: 0 },
    rejectionReason: { type: String, default: null, maxlength: 300 },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    reviewedAt: { type: Date, default: null },
    note: { type: String, default: null, maxlength: 300 },
    fileKey: { type: String, default: null },
    fileType: { type: String, enum: ["jpg", "png", "pdf", null], default: null },
    fileSize: { type: Number, default: null },
  },
  { timestamps: true },
);

PaymentProofSchema.index({ status: 1, createdAt: 1 });

const PaymentProof: Model<IPaymentProof> =
  mongoose.models.PaymentProof || mongoose.model<IPaymentProof>("PaymentProof", PaymentProofSchema);

export default PaymentProof;
