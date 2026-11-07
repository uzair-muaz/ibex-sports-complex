import { createHash, randomBytes } from "crypto";
import connectDB from "@/lib/mongodb";
import RefreshToken from "@/models/RefreshToken";

const DEFAULT_REFRESH_DAYS = 60;

export function refreshTokenLifetimeDays(): number {
  const raw = Number(process.env.API_REFRESH_TOKEN_DAYS);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_REFRESH_DAYS;
}

/** New random refresh token: "r_" + 48 random bytes (base64url). */
export function generateRefreshToken(): string {
  return `r_${randomBytes(48).toString("base64url")}`;
}

/** We store only this hash, never the token itself. */
export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function issueRefreshToken(userId: string, userAgent?: string | null) {
  await connectDB();
  const token = generateRefreshToken();
  const expiresAt = new Date(Date.now() + refreshTokenLifetimeDays() * 24 * 60 * 60 * 1000);
  await RefreshToken.create({
    userId,
    tokenHash: hashRefreshToken(token),
    expiresAt,
    userAgent: userAgent ? userAgent.slice(0, 300) : null,
  });
  return { token, expiresAt };
}

export type RotateResult =
  | { ok: true; userId: string }
  | { ok: false; reason: "unknown" | "expired" | "revoked" | "reused" };

/**
 * Use a refresh token once. On success it is marked used, and the caller
 * issues a new one. If an already-used token comes back, someone may have
 * stolen it, so every refresh token of that user is cancelled.
 */
export async function consumeRefreshToken(token: string): Promise<RotateResult> {
  if (!token || typeof token !== "string") return { ok: false, reason: "unknown" };
  await connectDB();
  const tokenHash = hashRefreshToken(token);
  const now = new Date();

  // Atomic: only one request can win the swap for the same token.
  const claimed = await RefreshToken.findOneAndUpdate(
    { tokenHash, revokedAt: null, replacedAt: null, expiresAt: { $gt: now } },
    { $set: { replacedAt: now } },
    { new: true },
  );
  if (claimed) return { ok: true, userId: claimed.userId.toString() };

  const existing = await RefreshToken.findOne({ tokenHash });
  if (!existing) return { ok: false, reason: "unknown" };
  if (existing.replacedAt) {
    await revokeAllRefreshTokens(existing.userId.toString());
    return { ok: false, reason: "reused" };
  }
  if (existing.revokedAt) return { ok: false, reason: "revoked" };
  return { ok: false, reason: "expired" };
}

/**
 * Cancel one refresh token. With a userId, only if it belongs to that user.
 * Without one, whoever holds the token may cancel it (harmless: it's theirs).
 */
export async function revokeRefreshToken(userId: string | null, token: string) {
  await connectDB();
  const result = await RefreshToken.updateOne(
    { ...(userId ? { userId } : {}), tokenHash: hashRefreshToken(token), revokedAt: null },
    { $set: { revokedAt: new Date() } },
  );
  return result.modifiedCount;
}

/** Cancel every refresh token of a user (sign out everywhere). */
export async function revokeAllRefreshTokens(userId: string) {
  await connectDB();
  const result = await RefreshToken.updateMany(
    { userId, revokedAt: null },
    { $set: { revokedAt: new Date() } },
  );
  return result.modifiedCount;
}
