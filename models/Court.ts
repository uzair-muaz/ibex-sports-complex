import mongoose, { Schema, Document, Model } from "mongoose";

export type CourtType = "PADEL" | "CRICKET" | "PICKLEBALL" | "FUTSAL";

export interface ICourt extends Document {
  name: string;
  type: CourtType;
  image: string;
  description: string;
  pricePerHour: number; // 0 for free courts
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CourtSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Court name is required"],
      trim: true,
    },
    type: {
      type: String,
      enum: ["PADEL", "CRICKET", "PICKLEBALL", "FUTSAL"],
      required: [true, "Court type is required"],
    },
    image: {
      type: String,
      default: "", // Images are hardcoded in components, not stored in DB
    },
    description: {
      type: String,
      required: [true, "Court description is required"],
      trim: true,
    },
    pricePerHour: {
      type: Number,
      required: [true, "Price per hour is required"],
      min: 0,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const Court: Model<ICourt> =
  mongoose.models.Court || mongoose.model<ICourt>("Court", CourtSchema);

export default Court;
