import { SignJWT, jwtVerify } from "jose";
import type { ApiUser } from "@/lib/api/types";

const ISSUER = "ibex-sports-arena";
const AUDIENCE = "ibex-mobile";

function secretKey() {
  const secret = process.env.NEXTAUTH_SECRET || process.env.API_JWT_SECRET;
  if (!secret) {
    throw new Error("NEXTAUTH_SECRET (or API_JWT_SECRET) is required for API tokens");
  }
  return new TextEncoder().encode(secret);
}

export type MobileAccessClaims = {
  sub: string;
  email?: string;
  role: ApiUser["role"];
  name?: string;
};

/** Long-lived access token for mobile / external clients (default 30 days). */
export async function signMobileAccessToken(
  user: ApiUser,
  expiresIn = process.env.API_JWT_EXPIRES_IN || "30d",
) {
  return new SignJWT({
    email: user.email,
    role: user.role,
    name: user.name,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secretKey());
}

export async function verifyMobileAccessToken(
  token: string,
): Promise<MobileAccessClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    if (!payload.sub) return null;
    const role = payload.role as ApiUser["role"] | undefined;
    if (!role) return null;
    return {
      sub: payload.sub,
      email: typeof payload.email === "string" ? payload.email : undefined,
      role,
      name: typeof payload.name === "string" ? payload.name : undefined,
    };
  } catch {
    return null;
  }
}
