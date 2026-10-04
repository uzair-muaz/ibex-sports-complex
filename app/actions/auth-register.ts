"use server";

import bcrypt from "bcryptjs";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

export type RegisterCustomerInput = {
  name: string;
  email: string;
  password: string;
  phone: string;
};

export type RegisterCustomerResult =
  | {
      success: true;
      user: { id: string; email: string; name: string; role: "user" };
    }
  | { success: false; error: string };

function normalizePakPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("03")) {
    return `+92${digits.slice(1)}`;
  }
  if (digits.length === 12 && digits.startsWith("92")) {
    return `+${digits}`;
  }
  return null;
}

export async function registerCustomer(
  input: RegisterCustomerInput,
): Promise<RegisterCustomerResult> {
  const name = input.name?.trim() || "";
  const email = input.email?.trim().toLowerCase() || "";
  const password = input.password || "";
  const phone = normalizePakPhone(input.phone || "");

  if (name.length < 2) {
    return { success: false, error: "Please enter your full name." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, error: "Please enter a valid email address." };
  }
  if (!phone) {
    return {
      success: false,
      error: "Please enter a valid Pakistani mobile number (03XXXXXXXXX).",
    };
  }
  if (password.length < 6) {
    return { success: false, error: "Password must be at least 6 characters." };
  }

  try {
    await connectDB();
    const existing = await User.findOne({ email });
    if (existing) {
      return {
        success: false,
        error: "An account with this email already exists. Sign in instead.",
      };
    }

    const hashed = await bcrypt.hash(password, 12);
    const user = await User.create({
      name,
      email,
      password: hashed,
      phone,
      role: "user",
    });

    return {
      success: true,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: "user",
      },
    };
  } catch (error) {
    console.error("registerCustomer error:", error);
    return {
      success: false,
      error: "Unable to create account. Please try again.",
    };
  }
}
