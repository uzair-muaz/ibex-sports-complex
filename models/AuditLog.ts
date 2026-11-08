import mongoose, { Schema, Document, Model } from "mongoose";
import { AUDIT_AREAS, type AuditArea, type AuditChange } from "@/lib/audit-rules";

/** One change made by staff (Admin → Audit log). Never edited or deleted by the app. */
export interface IAuditLog extends Document {
  actorId?: mongoose.Types.ObjectId | null;
  actorRole: string;
  area: AuditArea;
  action: string;
  /** What was changed (a court, booking, code…) and a readable name for it. */
  targetId?: string | null;
  targetLabel?: string | null;
  /** The customer it was about, when there is one (to show on their page). */
  customerId?: mongoose.Types.ObjectId | null;
  summary: string;
  changes: AuditChange[];
  createdAt: Date;
}

const AuditLogSchema = new Schema(
  {
    actorId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    actorRole: { type: String, required: true },
    area: { type: String, enum: AUDIT_AREAS, required: true },
    action: { type: String, required: true, maxlength: 40 },
    targetId: { type: String, default: null },
    targetLabel: { type: String, default: null, maxlength: 200 },
    customerId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    summary: { type: String, required: true, maxlength: 500 },
    changes: {
      type: [{ _id: false, path: String, from: String, to: String }],
      default: [],
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ area: 1, createdAt: -1 });
AuditLogSchema.index({ actorId: 1, createdAt: -1 });
AuditLogSchema.index({ customerId: 1, createdAt: -1 });
AuditLogSchema.index({ targetId: 1, createdAt: -1 });

const AuditLog: Model<IAuditLog> = mongoose.models.AuditLog || mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);

export default AuditLog;
