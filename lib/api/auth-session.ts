import { decodeJwt } from "jose";
import { isStaffRole } from "@/lib/authz";
import { apiError } from "@/lib/api/response";
import { signMobileAccessToken } from "@/lib/api/mobile-jwt";
import { issueRefreshToken } from "@/lib/api/refresh-tokens";
import { toMobileUser, type MobileUser, type MobileUserSource } from "@/lib/api/mobile-user";
import { toPkIso } from "@/lib/api/time";
import { claimBookingsByEmail } from "@/app/actions/account";
import { createTrustedApiActor } from "@/lib/action-auth";

export type SignInSource = MobileUserSource & {
  emailVerified?: Date | null;
};

export type SignInResponse = {
  accessToken: string;
  refreshToken: string;
  tokenType: "Bearer";
  /** When the access token stops working (Pakistan time). */
  expiresAt: string | null;
  /** Kept for older clients, e.g. "30d". */
  expiresIn: string;
  refreshExpiresAt: string | null;
  isNewAccount: boolean;
  claimedBookings: number;
  user: MobileUser;
};

/** 403 for staff / admin accounts trying to use the customer app. */
export function staffAccountError(request: Request) {
  return apiError(
    "Staff accounts cannot sign in to the customer app. Please use the website admin panel.",
    403,
    request,
    { code: "STAFF_ACCOUNT" },
  );
}

export function isStaffUser(user: { role?: string | null }) {
  return isStaffRole(user.role);
}

/**
 * Link old guest bookings with the same email. Only for emails we know the
 * person owns (Google / Apple verified), so nobody can register with someone
 * else's email and see their bookings.
 */
async function autoClaimBookings(user: SignInSource): Promise<number> {
  if (!user.emailVerified) return 0;
  try {
    const result = await claimBookingsByEmail(
      createTrustedApiActor({ id: user._id.toString(), role: user.role }),
    );
    return result.success ? result.claimed : 0;
  } catch (error) {
    console.error("autoClaimBookings failed:", error);
    return 0;
  }
}

/** The answer every sign-in / register address returns. */
export async function buildSignInResponse(
  user: SignInSource,
  opts: { isNewAccount: boolean; request: Request },
): Promise<SignInResponse> {
  const mobileUser = toMobileUser(user);
  const accessToken = await signMobileAccessToken({
    id: mobileUser.id,
    email: mobileUser.email,
    name: mobileUser.name,
    role: mobileUser.role,
  });
  const exp = decodeJwt(accessToken).exp;
  const refresh = await issueRefreshToken(
    mobileUser.id,
    opts.request.headers.get("user-agent"),
  );
  const claimedBookings = await autoClaimBookings(user);

  return {
    accessToken,
    refreshToken: refresh.token,
    tokenType: "Bearer",
    expiresAt: exp ? toPkIso(exp * 1000) : null,
    expiresIn: process.env.API_JWT_EXPIRES_IN || "30d",
    refreshExpiresAt: toPkIso(refresh.expiresAt),
    isNewAccount: opts.isNewAccount,
    claimedBookings,
    user: mobileUser,
  };
}
