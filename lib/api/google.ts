import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import type { ApiUser } from "@/lib/api/types";

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

  const allowedAudiences = [
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_IOS_CLIENT_ID,
    process.env.GOOGLE_ANDROID_CLIENT_ID,
  ].filter(Boolean) as string[];

  if (allowedAudiences.length === 0) {
    throw new Error(
      "Google auth misconfigured: set GOOGLE_CLIENT_ID and/or GOOGLE_IOS_CLIENT_ID / GOOGLE_ANDROID_CLIENT_ID",
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

/** Upsert customer user from Google identity (never elevates admin roles). */
export async function upsertUserFromGoogle(info: GoogleTokenInfo): Promise<ApiUser> {
  await connectDB();
  const email = info.email!.trim().toLowerCase();
  let user = await User.findOne({ email });

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
  }

  return {
    id: user._id.toString(),
    email: user.email,
    name: user.name,
    role: user.role,
    phone: user.phone,
    image: user.image,
  };
}
