import { createRemoteJWKSet, jwtVerify } from "jose";

const APPLE_ISSUER = "https://appleid.apple.com";
const appleKeys = createRemoteJWKSet(new URL("https://appleid.apple.com/auth/keys"));

export type AppleIdentity = {
  sub: string;
  email: string | null;
  emailVerified: boolean;
  isPrivateEmail: boolean;
};

/** Bundle id (iPhone app) and optional Services id (web / Android) Apple tokens may be issued for. */
export function appleAudiences(): string[] {
  return [process.env.APPLE_BUNDLE_ID, process.env.APPLE_SERVICE_ID].filter(
    (v): v is string => !!v && v.trim().length > 0,
  );
}

function truthy(value: unknown) {
  return value === true || value === "true";
}

/**
 * Check an Apple identityToken: signed by Apple, for our app, not expired.
 * Throws if anything is wrong.
 */
export async function verifyAppleIdentityToken(identityToken: string): Promise<AppleIdentity> {
  const audience = appleAudiences();
  if (audience.length === 0) {
    throw new Error("Apple sign-in is not set up: APPLE_BUNDLE_ID is missing");
  }
  const { payload } = await jwtVerify(identityToken, appleKeys, {
    issuer: APPLE_ISSUER,
    audience,
  });
  if (!payload.sub) throw new Error("Apple token has no user id");

  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : null;
  return {
    sub: payload.sub,
    email,
    emailVerified: truthy(payload.email_verified),
    isPrivateEmail: truthy(payload.is_private_email),
  };
}

/** Apple sends the name only on the very first sign-in, from the app, not in the token. */
export function nameFromAppleFullName(
  fullName: unknown,
): string | null {
  if (!fullName || typeof fullName !== "object") return null;
  const f = fullName as { givenName?: unknown; familyName?: unknown };
  const parts = [f.givenName, f.familyName]
    .filter((p): p is string => typeof p === "string" && p.trim().length > 0)
    .map((p) => p.trim());
  return parts.length ? parts.join(" ").slice(0, 101) : null;
}
