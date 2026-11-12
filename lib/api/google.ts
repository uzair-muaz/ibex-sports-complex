import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { isStaffRole } from "@/lib/authz";
import { grantSignUpBonus } from "@/lib/loyalty-bonus";

type GoogleTokenInfo = {
  sub?: string;
  email?: string;
  email_verified?: string | boolean;
  name?: string;
  picture?: string;
  aud?: string;
  error?: string;
  error_description?: string;
};

/**
 * OAuth client IDs a Google ID token may be issued for:
 * - `GOOGLE_CLIENT_ID`: the website's Web client (also used by web GIS);
 * - `GOOGLE_SERVER_CLIENT_ID`: the Web client the mobile app asks tokens for
 *   (its "server client ID"), when it differs from the website's;
 * - `GOOGLE_IOS_CLIENT_ID` / `GOOGLE_ANDROID_CLIENT_ID`: the app's own clients.
 */
export function googleAudiences(): string[] {
  return [
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_SERVER_CLIENT_ID,
    process.env.GOOGLE_IOS_CLIENT_ID,
    process.env.GOOGLE_ANDROID_CLIENT_ID,
  ]
    .map((v) => v?.trim())
    .filter((v): v is string => !!v);
}

/**
 * Verify a Google ID token from the mobile SDK (or web GIS).
 * Uses Google's tokeninfo endpoint (no extra Google client libs required).
 */
export async function verifyGoogleIdToken(
  idToken: string,
): Promise<GoogleTokenInfo> {
  const url = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`;
  const res = await fetch(url, { method: "GET", cache: "no-store" });
  const data = (await res.json()) as GoogleTokenInfo;
  if (!res.ok || data.error) {
    throw new Error(data.error_description || data.error || "Invalid Google token");
  }

  const allowedAudiences = googleAudiences();
  if (allowedAudiences.length === 0) {
    throw new Error(
      "Google auth misconfigured: set GOOGLE_CLIENT_ID and/or GOOGLE_SERVER_CLIENT_ID / GOOGLE_IOS_CLIENT_ID / GOOGLE_ANDROID_CLIENT_ID",
    );
  }

  if (!data.aud || !allowedAudiences.includes(data.aud)) {
    throw new Error("Google token audience mismatch");
  }

  if (!data.email) {
    throw new Error("Google token missing email");
  }

  const verified =
    data.email_verified === true || data.email_verified === "true";
  if (!verified) {
    throw new Error("Google email is not verified");
  }

  return data;
}

/**
 * Find or create the customer for a verified Google identity.
 * Staff accounts are returned untouched (the caller refuses them).
 */
export async function findOrCreateGoogleUser(info: GoogleTokenInfo) {
  await connectDB();
  const email = info.email!.trim().toLowerCase();
  let user = await User.findOne({ email });
  let isNewAccount = false;

  if (user && isStaffRole(user.role)) {
    return { user, isNewAccount, isStaff: true as const };
  }

  if (user) {
    if (info.sub && !user.googleId) user.googleId = info.sub;
    if (info.picture && !user.image) user.image = info.picture;
    if (info.name && !user.name) user.name = info.name;
    user.emailVerified = new Date();
    await user.save();
  } else {
    user = await User.create({
      email,
      name: info.name || email.split("@")[0],
      role: "user",
      image: info.picture,
      googleId: info.sub,
      emailVerified: new Date(),
    });
    isNewAccount = true;
    await grantSignUpBonus(String(user._id));
  }

  return { user, isNewAccount, isStaff: false as const };
}
