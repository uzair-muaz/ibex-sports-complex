import mongoose, { Schema, Document, Model } from "mongoose";

export type SupportTicketStatus = "open" | "closed";

export interface ISupportMessage {
  authorType: "user" | "admin";
  authorId?: mongoose.Types.ObjectId;
  body: string;
  createdAt: Date;
}

export interface ISupportTicket extends Document {
  userId: mongoose.Types.ObjectId;
  topic: string;
  status: SupportTicketStatus;
  bookingId?: mongoose.Types.ObjectId;
  messages: ISupportMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const SupportMessageSchema = new Schema(
  {
    authorType: { type: String, enum: ["user", "admin"], required: true },
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: false },
    body: { type: String, required: true, trim: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const SupportTicketSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    topic: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["open", "closed"],
      default: "open",
      index: true,
    },
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: "Booking",
      required: false,
    },
    messages: { type: [SupportMessageSchema], default: [] },
  },
  { timestamps: true },
);

const SupportTicket: Model<ISupportTicket> =
  mongoose.models.SupportTicket ||
  mongoose.model<ISupportTicket>("SupportTicket", SupportTicketSchema);

export default SupportTicket;
