import mongoose, { Schema, Document, Model } from "mongoose";

/** TypeORM-style changelog: one row per applied migration. */
export interface IMigrationRecord extends Document {
  timestamp: number;
  name: string;
  executedAt: Date;
}

const MigrationRecordSchema = new Schema<IMigrationRecord>(
  {
    timestamp: { type: Number, required: true, unique: true },
    name: { type: String, required: true, unique: true },
    executedAt: { type: Date, required: true, default: Date.now },
  },
  { collection: "migrations", timestamps: false },
);

const MigrationRecord: Model<IMigrationRecord> =
  mongoose.models.MigrationRecord ||
  mongoose.model<IMigrationRecord>("MigrationRecord", MigrationRecordSchema);

export default MigrationRecord;
