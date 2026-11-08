import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import type { NotificationType } from "@/models/Notification";

/** Player preferences (PDF §17). Stored on the user; missing values use the defaults. */

export const SKILL_LEVELS = ["beginner", "intermediate", "advanced", "pro"] as const;
export const HANDS = ["right", "left", "ambidextrous"] as const;
export const COURT_SIDES = ["left", "right", "either"] as const;
export const PREF_SPORTS = ["PADEL", "PICKLEBALL", "FUTSAL", "CRICKET"] as const;

export type NotificationSwitches = {
  matchReminders: boolean;
  paymentUpdates: boolean;
  courtAvailability: boolean;
  newsletter: boolean;
};

export type Preferences = {
  primarySport: (typeof PREF_SPORTS)[number] | null;
  skillLevel: (typeof SKILL_LEVELS)[number] | null;
  hand: (typeof HANDS)[number] | null;
  courtSide: (typeof COURT_SIDES)[number] | null;
  notifications: NotificationSwitches;
};

export const DEFAULT_PREFERENCES: Preferences = {
  primarySport: null,
  skillLevel: null,
  hand: null,
  courtSide: null,
  notifications: { matchReminders: true, paymentUpdates: true, courtAvailability: false, newsletter: false },
};

type Stored = Partial<Omit<Preferences, "notifications">> & { notifications?: Partial<NotificationSwitches> | null };

export function resolvePreferences(stored: Stored | null | undefined): Preferences {
  const d = DEFAULT_PREFERENCES;
  const n = stored?.notifications ?? {};
  const bool = (v: unknown, fallback: boolean) => (typeof v === "boolean" ? v : fallback);
  return {
    primarySport: stored?.primarySport ?? d.primarySport,
    skillLevel: stored?.skillLevel ?? d.skillLevel,
    hand: stored?.hand ?? d.hand,
    courtSide: stored?.courtSide ?? d.courtSide,
    notifications: {
      matchReminders: bool(n.matchReminders, d.notifications.matchReminders),
      paymentUpdates: bool(n.paymentUpdates, d.notifications.paymentUpdates),
      courtAvailability: bool(n.courtAvailability, d.notifications.courtAvailability),
      newsletter: bool(n.newsletter, d.notifications.newsletter),
    },
  };
}

/** Check a PUT body. Only the fields sent change; null clears a choice. */
export function validatePreferencesPatch(input: unknown): { ok: true; value: Stored } | { ok: false; error: string } {
  if (!input || typeof input !== "object") return { ok: false, error: "Nothing to save." };
  const b = input as Record<string, unknown>;
  const out: Stored = {};
  const choice = <T extends readonly string[]>(key: string, list: T) => {
    if (b[key] === undefined) return null;
    if (b[key] === null) {
      (out as Record<string, unknown>)[key] = null;
      return null;
    }
    if (!list.includes(b[key] as string)) return `${key} must be one of: ${list.join(", ")}.`;
    (out as Record<string, unknown>)[key] = b[key];
    return null;
  };
  for (const [key, list] of [
    ["primarySport", PREF_SPORTS],
    ["skillLevel", SKILL_LEVELS],
    ["hand", HANDS],
    ["courtSide", COURT_SIDES],
  ] as const) {
    const error = choice(key, list);
    if (error) return { ok: false, error };
  }
  if (b.notifications !== undefined) {
    if (!b.notifications || typeof b.notifications !== "object") return { ok: false, error: "notifications must be an object." };
    const n = b.notifications as Record<string, unknown>;
    const sw: Partial<NotificationSwitches> = {};
    for (const key of ["matchReminders", "paymentUpdates", "courtAvailability", "newsletter"] as const) {
      if (n[key] === undefined) continue;
      if (typeof n[key] !== "boolean") return { ok: false, error: `notifications.${key} must be true or false.` };
      sw[key] = n[key] as boolean;
    }
    out.notifications = sw;
  }
  return { ok: true, value: out };
}

export async function getPreferences(userId: string): Promise<Preferences> {
  await connectDB();
  const u = await User.findById(userId).select("preferences").lean();
  return resolvePreferences((u as { preferences?: Stored } | null)?.preferences);
}

export async function savePreferences(userId: string, patch: Stored): Promise<Preferences> {
  await connectDB();
  const set: Record<string, unknown> = {};
  for (const key of ["primarySport", "skillLevel", "hand", "courtSide"] as const) {
    if (patch[key] !== undefined) set[`preferences.${key}`] = patch[key];
  }
  for (const [key, v] of Object.entries(patch.notifications ?? {})) set[`preferences.notifications.${key}`] = v;
  if (Object.keys(set).length > 0) await User.updateOne({ _id: userId }, { $set: set });
  return getPreferences(userId);
}

/**
 * Which switch controls which message (push and email only; the in-app list
 * always keeps everything). Cancellations are always sent: they're about the
 * customer's money and court.
 */
export const SWITCH_FOR_TYPE: Record<NotificationType, keyof NotificationSwitches | null> = {
  booking_reminder: "matchReminders",
  proof_submitted: "paymentUpdates",
  payment_verified: "paymentUpdates",
  proof_rejected: "paymentUpdates",
  wallet_credited: "paymentUpdates",
  points_earned: "paymentUpdates",
  booking_cancelled: null,
  // Messages from Admin → Messages. Venue news (closures, changes) always goes; offers follow "newsletter".
  venue_news: null,
  offer: "newsletter",
};

export function allowedBySwitches(p: Preferences, type: NotificationType | null): boolean {
  if (!type) return true;
  const key = SWITCH_FOR_TYPE[type];
  return key ? p.notifications[key] : true;
}
