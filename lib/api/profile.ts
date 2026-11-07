import { normalizePakPhone } from "@/lib/phone";
import { pakistanNow } from "@/lib/booking-overlap";

export type ProfileUpdates = {
  name?: string;
  phone?: string;
  dateOfBirth?: string | null;
  gender?: "male" | "female" | "unspecified" | null;
  city?: string | null;
};

type Result =
  | { ok: true; updates: ProfileUpdates }
  | { ok: false; error: string; code: "VALIDATION_ERROR" | "INVALID_PHONE" };

const GENDERS = ["male", "female", "unspecified"] as const;

function isRealDate(key: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return false;
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/**
 * Check a profile change from the app or the website.
 * App: { firstName, lastName, phone, dateOfBirth, gender, city }.
 * Website: { name, phone }. Email can't be changed here.
 * `currentName` lets the app change only firstName or only lastName.
 */
export function validateProfilePatch(
  input: unknown,
  currentName: string,
  today: string = pakistanNow().dateKey,
): Result {
  if (!input || typeof input !== "object") {
    return { ok: false, error: "Nothing to update.", code: "VALIDATION_ERROR" };
  }
  const body = input as Record<string, unknown>;
  const updates: ProfileUpdates = {};

  if (body.firstName !== undefined || body.lastName !== undefined) {
    const parts = currentName.trim().split(/\s+/);
    const first = body.firstName !== undefined ? body.firstName : parts[0] || "";
    const last = body.lastName !== undefined ? body.lastName : parts.slice(1).join(" ");
    if (typeof first !== "string" || typeof last !== "string") {
      return { ok: false, error: "Names must be text.", code: "VALIDATION_ERROR" };
    }
    const f = first.trim();
    const l = last.trim();
    if (f.length < 1 || f.length > 50 || l.length < 1 || l.length > 50) {
      return {
        ok: false,
        error: "First and last name must be 1–50 characters each.",
        code: "VALIDATION_ERROR",
      };
    }
    updates.name = `${f} ${l}`;
  } else if (typeof body.name === "string" && body.name.trim()) {
    updates.name = body.name.trim().slice(0, 101);
  }

  // An empty phone means "no change" (the website sends "" when none is saved).
  if (body.phone !== undefined && body.phone !== "") {
    if (typeof body.phone !== "string") {
      return { ok: false, error: "Phone must be text.", code: "INVALID_PHONE" };
    }
    const normalized = normalizePakPhone(body.phone);
    if (!normalized) {
      return {
        ok: false,
        error: "Please enter a valid Pakistani mobile number (03XXXXXXXXX).",
        code: "INVALID_PHONE",
      };
    }
    updates.phone = normalized;
  }

  if (body.dateOfBirth !== undefined) {
    if (body.dateOfBirth === null || body.dateOfBirth === "") {
      updates.dateOfBirth = null;
    } else if (
      typeof body.dateOfBirth !== "string" ||
      !isRealDate(body.dateOfBirth) ||
      body.dateOfBirth < "1900-01-01" ||
      body.dateOfBirth > today
    ) {
      return {
        ok: false,
        error: "Date of birth must be a real past date (YYYY-MM-DD).",
        code: "VALIDATION_ERROR",
      };
    } else {
      updates.dateOfBirth = body.dateOfBirth;
    }
  }

  if (body.gender !== undefined) {
    if (body.gender === null || body.gender === "") {
      updates.gender = null;
    } else if (!GENDERS.includes(body.gender as (typeof GENDERS)[number])) {
      return {
        ok: false,
        error: "Gender must be male, female or unspecified.",
        code: "VALIDATION_ERROR",
      };
    } else {
      updates.gender = body.gender as (typeof GENDERS)[number];
    }
  }

  if (body.city !== undefined) {
    if (body.city === null || body.city === "") {
      updates.city = null;
    } else if (typeof body.city !== "string" || body.city.trim().length > 60) {
      return { ok: false, error: "City must be at most 60 characters.", code: "VALIDATION_ERROR" };
    } else {
      updates.city = body.city.trim() || null;
    }
  }

  return { ok: true, updates };
}
