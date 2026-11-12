import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { requireBffCustomer, bffOk, bffError } from "@/lib/bff/http";
import { apiError } from "@/lib/api/response";
import { getMyProfile } from "@/app/actions/account";
import { createTrustedApiActor } from "@/lib/action-auth";
import { toMobileUser } from "@/lib/api/mobile-user";
import { validateProfilePatch } from "@/lib/api/profile";
import { safeRevalidatePath } from "@/lib/safe-revalidate";

const PROFILE_FIELDS =
  "name email phone image role createdAt password googleId appleId dateOfBirth gender city";

/**
 * GET my profile. The answer keeps the website's fields (name, phone,
 * hasPassword, hasGoogleAuth, …) and adds the app's (id, firstName, lastName,
 * imageUrl, memberSince, dateOfBirth, gender, city, signInMethod).
 * Phone is shown as 03XXXXXXXXX.
 */
export async function GET(request: Request) {
  const gate = await requireBffCustomer(request);
  if (!gate.ok) return gate.response;

  const result = await getMyProfile(createTrustedApiActor(gate.user));
  if (!result.success) return bffError(result.error || "Failed", 400, request);

  await connectDB();
  const doc = await User.findById(gate.user.id).select(PROFILE_FIELDS).lean();
  if (!doc) return apiError("User not found", 404, request, { code: "ACCOUNT_NOT_FOUND" });

  return bffOk({ user: { ...result.user, ...toMobileUser(doc) } }, request);
}

/**
 * PATCH my profile. App: { firstName, lastName, phone, dateOfBirth, gender, city }.
 * Website: { name, phone }. Email can't be changed. Returns the saved profile.
 * Wrong phone → 400 INVALID_PHONE.
 */
export async function PATCH(request: Request) {
  const gate = await requireBffCustomer(request);
  if (!gate.ok) return gate.response;

  const body = await request.json().catch(() => null);

  try {
    await connectDB();
    const current = await User.findById(gate.user.id).select("name");
    if (!current) return apiError("User not found", 404, request, { code: "ACCOUNT_NOT_FOUND" });

    const check = validateProfilePatch(body, current.name);
    if (!check.ok) return apiError(check.error, 400, request, { code: check.code });

    const doc = await User.findByIdAndUpdate(
      gate.user.id,
      { $set: check.updates },
      { new: true, runValidators: true },
    )
      .select(PROFILE_FIELDS)
      .lean();
    if (!doc) return apiError("User not found", 404, request, { code: "ACCOUNT_NOT_FOUND" });

    safeRevalidatePath("/account");
    const mobile = toMobileUser(doc);
    return bffOk(
      {
        user: {
          _id: mobile.id,
          ...mobile,
          hasPassword: !!doc.password,
          hasGoogleAuth: !!doc.googleId,
        },
      },
      request,
    );
  } catch (err) {
    console.error("PATCH /api/v1/account/profile:", err);
    return apiError("Could not save profile", 500, request, { code: "SERVER_ERROR" });
  }
}

export async function OPTIONS(request: Request) {
  const { apiOptions } = await import("@/lib/api/response");
  return apiOptions(request);
}
