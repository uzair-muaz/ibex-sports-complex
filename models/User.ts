import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUser extends Document {
  email: string;
  password?: string;
  name: string;
  role: "super_admin" | "admin" | "user";
  image?: string;
  phone?: string;
  googleId?: string;
  emailVerified?: Date | null;
  passwordResetTokenHash?: string | null;
  passwordResetExpires?: Date | null;
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
  },
  {
    timestamps: true,
  },
);

UserSchema.index({ createdAt: -1 });
UserSchema.index({ role: 1, name: 1 });

const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;
