import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { apiOk, apiError, apiOptions } from "@/lib/api/response";
import { nameFromAppleFullName, verifyAppleIdentityToken } from "@/lib/api/apple";
import { buildSignInResponse, isStaffUser, staffAccountError } from "@/lib/api/auth-session";
import { grantSignUpBonus } from "@/lib/loyalty-bonus";

/**
 * Sign in with Apple (iPhone).
 * Body: { identityToken, authorizationCode?, fullName?: { givenName, familyName } }
 * Apple may hide the real email, so the account is linked by Apple's user id (sub).
 * authorizationCode is accepted but not used yet (needed later for Apple token revoke).
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    identityToken?: unknown;
    authorizationCode?: unknown;
    fullName?: unknown;
  } | null;

  const identityToken =
    typeof body?.identityToken === "string" ? body.identityToken.trim() : "";
  if (!identityToken) {
    return apiError("identityToken is required", 400, request, { code: "VALIDATION_ERROR" });
  }

  let apple;
  try {
    apple = await verifyAppleIdentityToken(identityToken);
  } catch (err) {
    console.warn("Apple token rejected:", err instanceof Error ? err.message : err);
    return apiError("Apple sign-in could not be verified.", 401, request, {
      code: "INVALID_APPLE_TOKEN",
    });
  }

  try {
    await connectDB();

    // 1. Already linked to this Apple id.
    let user = await User.findOne({ appleId: apple.sub });
    let isNewAccount = false;

    // 2. Same (verified) email as an existing account → link it.
    if (!user && apple.email && apple.emailVerified) {
      user = await User.findOne({ email: apple.email });
      if (user && !isStaffUser(user)) {
        user.appleId = apple.sub;
        user.emailVerified = new Date();
        await user.save();
      }
    }

    // 3. New customer.
    if (!user) {
      if (!apple.email) {
        return apiError(
          "Apple did not share an email. In iPhone Settings → Apple ID → Sign in with Apple, remove IBEX and try again.",
          400,
          request,
          { code: "INVALID_APPLE_TOKEN" },
        );
      }
      user = await User.create({
        email: apple.email,
        name: nameFromAppleFullName(body?.fullName) || "IBEX Player",
        role: "user",
        appleId: apple.sub,
        emailVerified: apple.emailVerified ? new Date() : null,
      });
      isNewAccount = true;
      await grantSignUpBonus(String(user._id));
    }

    if (isStaffUser(user)) return staffAccountError(request);

    return apiOk(await buildSignInResponse(user, { isNewAccount, request }), request);
  } catch (err) {
    console.error("POST /api/v1/auth/apple:", err);
    return apiError("Apple sign-in failed", 500, request, { code: "SERVER_ERROR" });
  }
}

export async function OPTIONS(request: Request) {
  return apiOptions(request);
}
