import { toPkIso } from "@/lib/api/time";

/** Minimal fields we read from a User document to build the app's profile. */
export type MobileUserSource = {
  _id: { toString(): string };
  email: string;
  name: string;
  role: "super_admin" | "admin" | "user";
  phone?: string | null;
  image?: string | null;
  password?: string | null;
  googleId?: string | null;
  appleId?: string | null;
  createdAt?: Date | string | null;
};

export type SignInMethod = "email" | "google" | "apple";

export type MobileUser = {
  id: string;
  firstName: string;
  lastName: string;
  /** Full name, kept for older clients. */
  name: string;
  email: string;
  phone: string | null;
  imageUrl: string | null;
  /** Same as imageUrl, kept for older clients. */
  image: string | null;
  role: "super_admin" | "admin" | "user";
  memberSince: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  city: string | null;
  signInMethod: SignInMethod;
};

/** "Hamza Ali Khan" → { firstName: "Hamza", lastName: "Ali Khan" }. */
export function splitName(full: string | null | undefined) {
  const parts = (full || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

/** "+923008521942" or "923008521942" → "03008521942". Anything else is returned as-is. */
export function toLocalPakPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("92")) return `0${digits.slice(2)}`;
  if (digits.length === 11 && digits.startsWith("03")) return digits;
  return phone;
}

/** Password users see "Change password"; otherwise the linked provider. */
export function signInMethodFor(user: Pick<MobileUserSource, "password" | "appleId" | "googleId">): SignInMethod {
  if (user.password) return "email";
  if (user.appleId) return "apple";
  if (user.googleId) return "google";
  return "email";
}

export function toMobileUser(user: MobileUserSource): MobileUser {
  const { firstName, lastName } = splitName(user.name);
  const image = user.image || null;
  return {
    id: user._id.toString(),
    firstName,
    lastName,
    name: user.name,
    email: user.email,
    phone: toLocalPakPhone(user.phone),
    imageUrl: image,
    image,
    role: user.role,
    memberSince: toPkIso(user.createdAt ?? null),
    // Filled in by Phase 2 (profile fields).
    dateOfBirth: null,
    gender: null,
    city: null,
    signInMethod: signInMethodFor(user),
  };
}
