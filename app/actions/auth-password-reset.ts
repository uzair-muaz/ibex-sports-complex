"use server";

import crypto from "crypto";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { sendHtmlEmail } from "@/lib/email";
import { getBaseUrl } from "@/lib/utils";

const RESET_TTL_MS = 60 * 60 * 1000; // 1 hour

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function buildResetEmailHtml(params: {
  name: string;
  resetUrl: string;
}): string {
  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#050505;font-family:Arial,sans-serif;color:#e4e4e7;">
  <div style="max-width:520px;margin:40px auto;padding:32px;background:#18181b;border-radius:16px;border:1px solid #27272a;">
    <p style="margin:0 0 8px;color:#2DD4BF;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;">IBEX Sports Complex</p>
    <h1 style="margin:0 0 16px;font-size:22px;color:#fafafa;">Reset your password</h1>
    <p style="margin:0 0 16px;line-height:1.5;color:#a1a1aa;">
      Hi ${params.name}, use the button below to set a new password for your account.
      This link expires in 1 hour.
    </p>
    <p style="margin:24px 0;">
      <a href="${params.resetUrl}"
         style="display:inline-block;background:#2DD4BF;color:#0F172A;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:10px;">
        Set password
      </a>
    </p>
    <p style="margin:0;font-size:12px;line-height:1.5;color:#71717a;">
      If you did not request this, you can ignore this email. Your password will stay the same.
    </p>
  </div>
</body>
</html>`;
}

/**
 * Always returns success to avoid email enumeration.
 * Works for Google-only accounts too (lets them set a password).
 */
export async function requestPasswordReset(emailRaw: string): Promise<{
  success: true;
  message: string;
}> {
  const email = emailRaw?.trim().toLowerCase() || "";
  const generic = {
    success: true as const,
    message:
      "If an account exists for that email, we sent a password reset link.",
  };

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return generic;
  }

  try {
    await connectDB();
    const user = await User.findOne({ email }).select("+passwordResetTokenHash +passwordResetExpires name email role");
    // Only customer accounts use public forgot-password (staff use admin ops)
    if (!user || user.role === "admin" || user.role === "super_admin") {
      return generic;
    }

    const token = crypto.randomBytes(32).toString("hex");
    user.passwordResetTokenHash = hashToken(token);
    user.passwordResetExpires = new Date(Date.now() + RESET_TTL_MS);
    await user.save();

    const resetUrl = `${getBaseUrl()}/reset-password?token=${encodeURIComponent(token)}`;
    const sent = await sendHtmlEmail({
      to: user.email,
      subject: "Reset your IBEX password",
      html: buildResetEmailHtml({
        name: user.name || "there",
        resetUrl,
      }),
    });

    if (!sent.success) {
      console.error("Password reset email failed:", sent.message);
    }
  } catch (error) {
    console.error("requestPasswordReset error:", error);
  }

  return generic;
}

export async function resetPasswordWithToken(input: {
  token: string;
  newPassword: string;
}): Promise<{ success: true } | { success: false; error: string }> {
  const token = input.token?.trim() || "";
  const newPassword = input.newPassword || "";

  if (!token) {
    return { success: false, error: "Reset link is invalid or expired." };
  }
  if (newPassword.length < 6) {
    return {
      success: false,
      error: "Password must be at least 6 characters.",
    };
  }

  try {
    await connectDB();
    const tokenHash = hashToken(token);
    const user = await User.findOne({
      passwordResetTokenHash: tokenHash,
      passwordResetExpires: { $gt: new Date() },
    }).select("+passwordResetTokenHash +passwordResetExpires password role");

    if (!user || user.role === "admin" || user.role === "super_admin") {
      return {
        success: false,
        error: "Reset link is invalid or expired.",
      };
    }

    user.password = await bcrypt.hash(newPassword, 12);
    user.passwordResetTokenHash = null;
    user.passwordResetExpires = null;
    await user.save();

    return { success: true };
  } catch (error) {
    console.error("resetPasswordWithToken error:", error);
    return {
      success: false,
      error: "Unable to reset password. Please try again.",
    };
  }
}
