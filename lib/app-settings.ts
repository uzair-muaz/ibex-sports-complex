import connectDB from "@/lib/mongodb";
import AppSettings, {
  type ILoyaltySetting,
  type IPaymentSetting,
  type ISportSetting,
  type IVenueSetting,
  type SportKey,
} from "@/models/AppSettings";

/** Settings after defaults are filled in. Every field is present. */
export type SportRules = {
  sport: SportKey;
  label: string;
  showInApp: boolean;
  imageUrl: string;
  badge: string | null;
  durationsMinutes: number[];
  defaultDurationMinutes: number;
  bookingWindowDays: number;
  sortOrder: number;
};

export type VenueInfo = {
  name: string;
  branchName: string;
  hoursLabel: string;
  address: string;
  latitude: number;
  longitude: number;
  phone: string;
  whatsApp: string;
  email: string;
  facilityNote: string | null;
  weatherSummary: string | null;
};

export type LoyaltyRules = {
  earnBasis: "per_pkr" | "per_hour";
  /** Points earned per block (per_pkr) or per hour (per_hour). */
  earnPoints: number;
  /** Size of a spending block in PKR (used when earnBasis is per_pkr). */
  earnPerPkr: number;
  minRedeemPoints: number;
  maxRedeemPercent: number;
  pkrPerPoint: number;
  signUpBonusPoints: number;
  earnOnMembershipHours: boolean;
};

export type PaymentRules = {
  minAdvancePercent: number;
};

export type ResolvedAppSettings = {
  venue: VenueInfo;
  sports: SportRules[];
  cancellationNoticeMinutes: number;
  loyalty: LoyaltyRules;
  payments: PaymentRules;
};

export const SPORT_KEYS: SportKey[] = ["PADEL", "PICKLEBALL", "FUTSAL", "CRICKET"];

/** Shortest booking the server accepts today (app/actions/bookings.ts). */
export function minDurationMinutesFor(sport: SportKey): number {
  return sport === "FUTSAL" ? 90 : 60;
}

/** Today's values, taken from what the website already shows and allows. */
export const DEFAULT_APP_SETTINGS: ResolvedAppSettings = {
  venue: {
    name: "IBEX Sports Complex",
    branchName: "IBEX Islamabad",
    hoursLabel: "Open daily 12 PM – 4 AM",
    address:
      "Ibex Sports Complex, Toot Stop Near Orchid Marquee, Wild Life Park Road, Main Islamabad Expy, Islamabad, 42700",
    latitude: 33.5849499,
    longitude: 73.1439709,
    phone: "+923255429429",
    whatsApp: "+923255429429",
    email: "ibexsportscomplex@gmail.com",
    facilityNote: null,
    weatherSummary: null,
  },
  sports: [
    {
      sport: "PADEL",
      label: "Padel",
      showInApp: true,
      imageUrl: "/images/paddle.jpg",
      badge: "Most Popular",
      durationsMinutes: [60, 90, 120],
      defaultDurationMinutes: 90,
      bookingWindowDays: 14,
      sortOrder: 1,
    },
    {
      sport: "PICKLEBALL",
      label: "Pickleball",
      showInApp: true,
      imageUrl: "/images/pickleball.jpg",
      badge: "New",
      durationsMinutes: [60, 90, 120],
      defaultDurationMinutes: 60,
      bookingWindowDays: 14,
      sortOrder: 2,
    },
    {
      sport: "FUTSAL",
      label: "Futsal",
      showInApp: true,
      imageUrl: "/images/futsal.jpg",
      badge: null,
      durationsMinutes: [90, 180],
      defaultDurationMinutes: 90,
      bookingWindowDays: 14,
      sortOrder: 3,
    },
    {
      sport: "CRICKET",
      label: "Cricket",
      showInApp: false,
      imageUrl: "/images/cricket.webp",
      badge: null,
      durationsMinutes: [60, 90, 120],
      defaultDurationMinutes: 60,
      bookingWindowDays: 14,
      sortOrder: 4,
    },
  ],
  cancellationNoticeMinutes: 240,
  // Today's staging rules (lib/loyalty-rules.ts): 10 points per hour played,
  // use from 100 points, up to 50% of the court fee, 1 point = PKR 1.
  loyalty: {
    earnBasis: "per_hour",
    earnPoints: 10,
    earnPerPkr: 100,
    minRedeemPoints: 100,
    maxRedeemPercent: 50,
    pkrPerPoint: 1,
    signUpBonusPoints: 0,
    earnOnMembershipHours: false,
  },
  payments: { minAdvancePercent: 50 },
};

type StoredSettings = {
  venue?: IVenueSetting | null;
  sports?: ISportSetting[] | null;
  cancellationNoticeMinutes?: number | null;
  loyalty?: ILoyaltySetting | null;
  payments?: IPaymentSetting | null;
};

function pick<T>(value: T | null | undefined, fallback: T): T {
  return value === undefined || value === null || (typeof value === "string" && value === "")
    ? fallback
    : value;
}

/** Stored values on top of defaults. Pure, so it is easy to test. */
export function resolveAppSettings(stored: StoredSettings | null | undefined): ResolvedAppSettings {
  const d = DEFAULT_APP_SETTINGS;
  const v = stored?.venue || {};
  const venue: VenueInfo = {
    name: pick(v.name, d.venue.name),
    branchName: pick(v.branchName, d.venue.branchName),
    hoursLabel: pick(v.hoursLabel, d.venue.hoursLabel),
    address: pick(v.address, d.venue.address),
    latitude: pick(v.latitude, d.venue.latitude),
    longitude: pick(v.longitude, d.venue.longitude),
    phone: pick(v.phone, d.venue.phone),
    whatsApp: pick(v.whatsApp, d.venue.whatsApp),
    email: pick(v.email, d.venue.email),
    // Optional notes: an empty value means "show nothing".
    facilityNote: v.facilityNote === undefined ? d.venue.facilityNote : v.facilityNote || null,
    weatherSummary:
      v.weatherSummary === undefined ? d.venue.weatherSummary : v.weatherSummary || null,
  };

  const storedSports = new Map((stored?.sports || []).map((s) => [s.sport, s]));
  const sports = d.sports
    .map((def): SportRules => {
      const s = storedSports.get(def.sport);
      if (!s) return { ...def, durationsMinutes: [...def.durationsMinutes] };
      const durations =
        Array.isArray(s.durationsMinutes) && s.durationsMinutes.length > 0
          ? [...s.durationsMinutes].sort((a, b) => a - b)
          : [...def.durationsMinutes];
      const wantedDefault = pick(s.defaultDurationMinutes, def.defaultDurationMinutes);
      return {
        sport: def.sport,
        label: pick(s.label, def.label),
        showInApp: pick(s.showInApp, def.showInApp),
        imageUrl: pick(s.imageUrl, def.imageUrl),
        badge: s.badge === undefined ? def.badge : s.badge || null,
        durationsMinutes: durations,
        defaultDurationMinutes: durations.includes(wantedDefault) ? wantedDefault : durations[0],
        bookingWindowDays: pick(s.bookingWindowDays, def.bookingWindowDays),
        sortOrder: pick(s.sortOrder, def.sortOrder),
      };
    })
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const l = stored?.loyalty || {};
  const loyalty: LoyaltyRules = {
    earnBasis: pick(l.earnBasis, d.loyalty.earnBasis),
    earnPoints: pick(l.earnPoints, d.loyalty.earnPoints),
    earnPerPkr: pick(l.earnPerPkr, d.loyalty.earnPerPkr),
    minRedeemPoints: pick(l.minRedeemPoints, d.loyalty.minRedeemPoints),
    maxRedeemPercent: pick(l.maxRedeemPercent, d.loyalty.maxRedeemPercent),
    pkrPerPoint: pick(l.pkrPerPoint, d.loyalty.pkrPerPoint),
    signUpBonusPoints: pick(l.signUpBonusPoints, d.loyalty.signUpBonusPoints),
    earnOnMembershipHours: pick(l.earnOnMembershipHours, d.loyalty.earnOnMembershipHours),
  };

  return {
    venue,
    sports,
    cancellationNoticeMinutes: pick(stored?.cancellationNoticeMinutes, d.cancellationNoticeMinutes),
    loyalty,
    payments: {
      minAdvancePercent: pick(stored?.payments?.minAdvancePercent, d.payments.minAdvancePercent),
    },
  };
}

export type SettingsPatch = {
  venue?: Partial<VenueInfo>;
  sports?: Array<Partial<SportRules> & { sport: SportKey }>;
  cancellationNoticeMinutes?: number;
  loyalty?: Partial<LoyaltyRules>;
  payments?: Partial<PaymentRules>;
};

type CheckResult = { ok: true; value: SettingsPatch } | { ok: false; error: string };

const isInt = (n: unknown): n is number => typeof n === "number" && Number.isInteger(n);

/** Check an admin's changes before saving. Returns a plain-English error. */
export function validateSettingsPatch(input: unknown): CheckResult {
  if (!input || typeof input !== "object") return { ok: false, error: "Nothing to save." };
  const body = input as Record<string, unknown>;
  const out: SettingsPatch = {};

  if (body.cancellationNoticeMinutes !== undefined) {
    const m = body.cancellationNoticeMinutes;
    if (!isInt(m) || m < 0 || m > 10080) {
      return { ok: false, error: "Cancellation notice must be 0–10080 minutes (up to 7 days)." };
    }
    out.cancellationNoticeMinutes = m;
  }

  if (body.venue !== undefined) {
    if (!body.venue || typeof body.venue !== "object") return { ok: false, error: "Venue must be an object." };
    const v = body.venue as Record<string, unknown>;
    const venue: Partial<VenueInfo> = {};
    const textFields: Array<[keyof VenueInfo, number, boolean]> = [
      ["name", 80, true],
      ["branchName", 80, true],
      ["hoursLabel", 80, true],
      ["address", 300, true],
      ["phone", 30, true],
      ["whatsApp", 30, true],
      ["email", 120, true],
      ["facilityNote", 120, false],
      ["weatherSummary", 60, false],
    ];
    for (const [key, max, required] of textFields) {
      if (v[key] === undefined) continue;
      if (v[key] === null && !required) {
        (venue as Record<string, unknown>)[key] = null;
        continue;
      }
      if (typeof v[key] !== "string") return { ok: false, error: `${key} must be text.` };
      const text = (v[key] as string).trim();
      if (required && !text) return { ok: false, error: `${key} cannot be empty.` };
      if (text.length > max) return { ok: false, error: `${key} must be at most ${max} characters.` };
      (venue as Record<string, unknown>)[key] = required ? text : text || null;
    }
    if (venue.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(venue.email)) {
      return { ok: false, error: "Venue email is not valid." };
    }
    for (const [key, min, max] of [["latitude", -90, 90], ["longitude", -180, 180]] as const) {
      if (v[key] === undefined) continue;
      const n = v[key];
      if (typeof n !== "number" || !Number.isFinite(n) || n < min || n > max) {
        return { ok: false, error: `${key} must be a number between ${min} and ${max}.` };
      }
      venue[key] = n;
    }
    out.venue = venue;
  }

  if (body.loyalty !== undefined) {
    if (!body.loyalty || typeof body.loyalty !== "object") {
      return { ok: false, error: "Points rules must be an object." };
    }
    const l = body.loyalty as Record<string, unknown>;
    const loyalty: Partial<LoyaltyRules> = {};
    if (l.earnBasis !== undefined) {
      if (l.earnBasis !== "per_pkr" && l.earnBasis !== "per_hour") {
        return { ok: false, error: "Points are earned either per amount spent or per hour played." };
      }
      loyalty.earnBasis = l.earnBasis;
    }
    const intRules: Array<[keyof LoyaltyRules, number, number, string]> = [
      ["earnPoints", 0, 10000, "Points earned"],
      ["earnPerPkr", 1, 100000, "Spending block (PKR)"],
      ["minRedeemPoints", 0, 1000000, "Minimum points to use"],
      ["maxRedeemPercent", 0, 100, "Most of the court fee points can pay (%)"],
      ["signUpBonusPoints", 0, 100000, "Sign-up bonus"],
    ];
    for (const [key, min, max, label] of intRules) {
      if (l[key] === undefined) continue;
      if (!isInt(l[key]) || (l[key] as number) < min || (l[key] as number) > max) {
        return { ok: false, error: `${label} must be a whole number from ${min} to ${max}.` };
      }
      (loyalty as Record<string, unknown>)[key] = l[key];
    }
    if (l.pkrPerPoint !== undefined) {
      const v = l.pkrPerPoint;
      if (typeof v !== "number" || !Number.isFinite(v) || v < 0.01 || v > 1000) {
        return { ok: false, error: "PKR value of 1 point must be from 0.01 to 1000." };
      }
      loyalty.pkrPerPoint = v;
    }
    if (l.earnOnMembershipHours !== undefined) {
      if (typeof l.earnOnMembershipHours !== "boolean") {
        return { ok: false, error: "earnOnMembershipHours must be true or false." };
      }
      loyalty.earnOnMembershipHours = l.earnOnMembershipHours;
    }
    out.loyalty = loyalty;
  }

  if (body.payments !== undefined) {
    if (!body.payments || typeof body.payments !== "object") {
      return { ok: false, error: "Payment settings must be an object." };
    }
    const p = body.payments as Record<string, unknown>;
    if (p.minAdvancePercent !== undefined) {
      if (!isInt(p.minAdvancePercent) || p.minAdvancePercent < 0 || p.minAdvancePercent > 100) {
        return { ok: false, error: "Advance must be a whole % from 0 to 100." };
      }
      out.payments = { minAdvancePercent: p.minAdvancePercent };
    }
  }

  if (body.sports !== undefined) {
    if (!Array.isArray(body.sports)) return { ok: false, error: "sports must be a list." };
    const seen = new Set<string>();
    out.sports = [];
    for (const raw of body.sports) {
      if (!raw || typeof raw !== "object") return { ok: false, error: "Each sport must be an object." };
      const s = raw as Record<string, unknown>;
      const sport = s.sport as SportKey;
      if (!SPORT_KEYS.includes(sport)) return { ok: false, error: `Unknown sport: ${String(s.sport)}` };
      if (seen.has(sport)) return { ok: false, error: `${sport} is listed twice.` };
      seen.add(sport);
      const item: Partial<SportRules> & { sport: SportKey } = { sport };

      if (s.label !== undefined) {
        if (typeof s.label !== "string" || !s.label.trim() || s.label.trim().length > 40) {
          return { ok: false, error: `${sport}: label must be 1–40 characters.` };
        }
        item.label = s.label.trim();
      }
      if (s.showInApp !== undefined) {
        if (typeof s.showInApp !== "boolean") return { ok: false, error: `${sport}: showInApp must be true or false.` };
        item.showInApp = s.showInApp;
      }
      if (s.imageUrl !== undefined) {
        if (typeof s.imageUrl !== "string" || !/^(https:\/\/|\/)/.test(s.imageUrl.trim())) {
          return { ok: false, error: `${sport}: image must be an https:// link or a /images/… path.` };
        }
        item.imageUrl = s.imageUrl.trim();
      }
      if (s.badge !== undefined) {
        if (s.badge !== null && (typeof s.badge !== "string" || s.badge.trim().length > 30)) {
          return { ok: false, error: `${sport}: badge must be at most 30 characters.` };
        }
        item.badge = typeof s.badge === "string" && s.badge.trim() ? s.badge.trim() : null;
      }
      if (s.bookingWindowDays !== undefined) {
        if (!isInt(s.bookingWindowDays) || s.bookingWindowDays < 1 || s.bookingWindowDays > 365) {
          return { ok: false, error: `${sport}: booking window must be 1–365 days.` };
        }
        item.bookingWindowDays = s.bookingWindowDays;
      }
      if (s.sortOrder !== undefined) {
        if (!isInt(s.sortOrder)) return { ok: false, error: `${sport}: order must be a whole number.` };
        item.sortOrder = s.sortOrder;
      }
      if (s.durationsMinutes !== undefined) {
        const list = s.durationsMinutes;
        const min = minDurationMinutesFor(sport);
        if (
          !Array.isArray(list) ||
          list.length === 0 ||
          list.length > 12 ||
          !list.every((m) => isInt(m) && m % 30 === 0 && m >= min && m <= 720)
        ) {
          return {
            ok: false,
            error: `${sport}: durations must be steps of 30 minutes, from ${min} to 720.`,
          };
        }
        item.durationsMinutes = [...new Set(list as number[])].sort((a, b) => a - b);
      }
      if (s.defaultDurationMinutes !== undefined) {
        if (!isInt(s.defaultDurationMinutes)) {
          return { ok: false, error: `${sport}: default duration must be a whole number of minutes.` };
        }
        item.defaultDurationMinutes = s.defaultDurationMinutes;
      }
      out.sports.push(item);
    }
  }

  return { ok: true, value: out };
}

export async function getAppSettings(): Promise<ResolvedAppSettings> {
  await connectDB();
  const doc = await AppSettings.findOne({ key: "main" }).lean();
  return resolveAppSettings(doc as StoredSettings | null);
}

/** Save an admin's (already validated) changes on top of what is stored. */
export async function updateAppSettings(
  patch: SettingsPatch,
  updatedBy: string,
): Promise<{ ok: true; settings: ResolvedAppSettings } | { ok: false; error: string }> {
  await connectDB();
  const current = resolveAppSettings(
    (await AppSettings.findOne({ key: "main" }).lean()) as StoredSettings | null,
  );

  const sports = current.sports.map((s) => {
    const change = patch.sports?.find((p) => p.sport === s.sport);
    return change ? { ...s, ...change } : s;
  });
  for (const s of sports) {
    if (!s.durationsMinutes.includes(s.defaultDurationMinutes)) {
      return {
        ok: false,
        error: `${s.label}: the default duration must be one of its durations.`,
      };
    }
  }

  const next = {
    venue: { ...current.venue, ...(patch.venue || {}) },
    sports,
    cancellationNoticeMinutes: patch.cancellationNoticeMinutes ?? current.cancellationNoticeMinutes,
    loyalty: { ...current.loyalty, ...(patch.loyalty || {}) },
    payments: { ...current.payments, ...(patch.payments || {}) },
    updatedBy,
  };

  await AppSettings.findOneAndUpdate(
    { key: "main" },
    { $set: next, $setOnInsert: { key: "main" } },
    { upsert: true, new: true, runValidators: true },
  );
  return { ok: true, settings: resolveAppSettings(next) };
}
