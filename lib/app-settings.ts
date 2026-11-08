import { deleteUnusedPhotos } from "@/lib/media";
import connectDB from "@/lib/mongodb";
import Court from "@/models/Court";
import AppSettings, {
  type ILoyaltySetting,
  type IPaymentSetting,
  type ISportSetting,
  type IVenueSetting,
  type SportKey,
} from "@/models/AppSettings";
import { DEFAULT_VENUE, isWebLink, type VenueInfo } from "@/lib/venue-rules";
import { BUILT_IN_SPORTS, isSportCode, labelFromSportCode } from "@/lib/sport-rules";

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

export type { VenueInfo };

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

export type BankAccount = {
  bankName: string;
  accountTitle: string;
  accountNumber: string;
  iban: string | null;
};

/** Membership rules shown on the website and used when paying with hours. */
export type MembershipRules = {
  /** Hours before the start a booking paid with hours must be made, Mon–Fri. */
  weekdayAdvanceHours: number;
  /** Same, Sat–Sun. */
  weekendAdvanceHours: number;
  /** Days after a plan ends when unused hours still carry over to a new one. */
  carryOverGraceDays: number;
};

export type PaymentRules = {
  minAdvancePercent: number;
  /** Where customers send the advance. Empty until the super admin adds them. */
  bankAccounts: BankAccount[];
  transferNote: string;
  verificationNote: string;
  /** How the rest of the price is paid after the advance. */
  balanceNote: string;
};

export type ResolvedAppSettings = {
  venue: VenueInfo;
  sports: SportRules[];
  cancellationNoticeMinutes: number;
  loyalty: LoyaltyRules;
  payments: PaymentRules;
  membership: MembershipRules;
  /** Super admin's FAQs, or null to use the built-in ones (lib/faqs.ts). */
  faqs: Faq[] | null;
};

export type Faq = { question: string; answer: string };

/** The built-in sports. More can be added in App Settings (lib/sport-rules.ts). */
export const SPORT_KEYS: SportKey[] = [...BUILT_IN_SPORTS];

/** Starting rules for a sport the super admin adds. Hidden from the app until they turn it on. */
export function newSportDefaults(sport: string, label: string, sortOrder: number): SportRules {
  return {
    sport,
    label,
    showInApp: false,
    imageUrl: "",
    badge: null,
    durationsMinutes: [60, 90, 120],
    defaultDurationMinutes: 60,
    bookingWindowDays: 14,
    sortOrder,
  };
}

/**
 * Shortest length the super admin may allow for a sport. Same for every sport
 * (a booking is at least 1 hour); each sport's real lengths are set in App Settings.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function minDurationMinutesFor(_sport: SportKey): number {
  return 60;
}

/** Today's values, taken from what the website already shows and allows. */
export const DEFAULT_APP_SETTINGS: ResolvedAppSettings = {
  venue: { ...DEFAULT_VENUE },

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
  payments: {
    minAdvancePercent: 50,
    bankAccounts: [],
    transferNote: "Write your booking reference in the transfer description.",
    verificationNote: "Our team checks payments by hand. You will get a notification.",
    balanceNote: "Pay the remaining balance at the venue.",
  },
  membership: { weekdayAdvanceHours: 2, weekendAdvanceHours: 24, carryOverGraceDays: 7 },
  faqs: null,
};

type StoredSettings = {
  venue?: IVenueSetting | null;
  sports?: ISportSetting[] | null;
  cancellationNoticeMinutes?: number | null;
  loyalty?: ILoyaltySetting | null;
  payments?: IPaymentSetting | null;
  membership?: Partial<MembershipRules> | null;
  faqs?: Faq[] | null;
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
    // Links: an empty value means "hide it" (map link falls back to the pin).
    mapUrl: v.mapUrl === undefined ? d.venue.mapUrl : v.mapUrl || null,
    instagramUrl: v.instagramUrl === undefined ? d.venue.instagramUrl : v.instagramUrl || null,
    facebookUrl: v.facebookUrl === undefined ? d.venue.facebookUrl : v.facebookUrl || null,
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
    .concat(
      // Sports the super admin added (not built in).
      (stored?.sports || [])
        .filter((s) => isSportCode(s.sport) && !d.sports.some((def) => def.sport === s.sport))
        .map((s): SportRules => {
          const base = newSportDefaults(s.sport, labelFromSportCode(s.sport), 100);
          const durations =
            Array.isArray(s.durationsMinutes) && s.durationsMinutes.length > 0
              ? [...s.durationsMinutes].sort((a, b) => a - b)
              : base.durationsMinutes;
          const wantedDefault = pick(s.defaultDurationMinutes, base.defaultDurationMinutes);
          return {
            sport: s.sport,
            label: pick(s.label, base.label),
            showInApp: pick(s.showInApp, base.showInApp),
            imageUrl: pick(s.imageUrl, base.imageUrl),
            badge: s.badge || null,
            durationsMinutes: durations,
            defaultDurationMinutes: durations.includes(wantedDefault) ? wantedDefault : durations[0],
            bookingWindowDays: pick(s.bookingWindowDays, base.bookingWindowDays),
            sortOrder: pick(s.sortOrder, base.sortOrder),
          };
        }),
    )
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
      bankAccounts: (stored?.payments?.bankAccounts ?? d.payments.bankAccounts).map((a) => ({
        bankName: a.bankName,
        accountTitle: a.accountTitle,
        accountNumber: a.accountNumber,
        iban: a.iban || null,
      })),
      transferNote: pick(stored?.payments?.transferNote, d.payments.transferNote),
      verificationNote: pick(stored?.payments?.verificationNote, d.payments.verificationNote),
      balanceNote: pick(stored?.payments?.balanceNote, d.payments.balanceNote),
    },
    membership: {
      weekdayAdvanceHours: pick(stored?.membership?.weekdayAdvanceHours, d.membership.weekdayAdvanceHours),
      weekendAdvanceHours: pick(stored?.membership?.weekendAdvanceHours, d.membership.weekendAdvanceHours),
      carryOverGraceDays: pick(stored?.membership?.carryOverGraceDays, d.membership.carryOverGraceDays),
    },
    faqs:
      Array.isArray(stored?.faqs) && stored.faqs.length > 0
        ? stored.faqs.map((f) => ({ question: f.question, answer: f.answer }))
        : null,
  };
}

export type SettingsPatch = {
  venue?: Partial<VenueInfo>;
  sports?: Array<Partial<SportRules> & { sport: SportKey }>;
  /** Added sports to take out of the list (built-in ones can only be hidden). */
  removeSports?: SportKey[];
  cancellationNoticeMinutes?: number;
  loyalty?: Partial<LoyaltyRules>;
  payments?: Partial<PaymentRules>;
  membership?: Partial<MembershipRules>;
  /** null = go back to the built-in FAQs. */
  faqs?: Faq[] | null;
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
      ["mapUrl", 300, false],
      ["instagramUrl", 300, false],
      ["facebookUrl", 300, false],
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
    for (const key of ["mapUrl", "instagramUrl", "facebookUrl"] as const) {
      const link = venue[key];
      if (link && !isWebLink(link)) return { ok: false, error: `${key} must be a web link starting with https://` };
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
    const pay: Partial<PaymentRules> = {};
    if (p.minAdvancePercent !== undefined) {
      if (!isInt(p.minAdvancePercent) || p.minAdvancePercent < 0 || p.minAdvancePercent > 100) {
        return { ok: false, error: "Advance must be a whole % from 0 to 100." };
      }
      pay.minAdvancePercent = p.minAdvancePercent;
    }
    if (p.bankAccounts !== undefined) {
      if (!Array.isArray(p.bankAccounts) || p.bankAccounts.length > 5) {
        return { ok: false, error: "Bank accounts must be a list of up to 5." };
      }
      const accounts: BankAccount[] = [];
      for (const raw of p.bankAccounts) {
        const a = (raw || {}) as Record<string, unknown>;
        const text = (v: unknown) => (typeof v === "string" ? v.trim() : "");
        const acc = {
          bankName: text(a.bankName),
          accountTitle: text(a.accountTitle),
          accountNumber: text(a.accountNumber),
          iban: text(a.iban) || null,
        };
        if (!acc.bankName || !acc.accountTitle || !acc.accountNumber) {
          return { ok: false, error: "Each bank account needs a bank name, account title and account number." };
        }
        if ([acc.bankName, acc.accountTitle, acc.accountNumber, acc.iban ?? ""].some((v) => v.length > 80)) {
          return { ok: false, error: "Bank account details must be 80 characters or less." };
        }
        accounts.push(acc);
      }
      pay.bankAccounts = accounts;
    }
    for (const key of ["transferNote", "verificationNote", "balanceNote"] as const) {
      if (p[key] !== undefined) {
        const v = typeof p[key] === "string" ? (p[key] as string).trim() : "";
        if (!v || v.length > 300) return { ok: false, error: "Payment notes must be 1–300 characters." };
        pay[key] = v;
      }
    }
    if (Object.keys(pay).length > 0) out.payments = pay;
  }

  if (body.membership !== undefined) {
    if (!body.membership || typeof body.membership !== "object") return { ok: false, error: "membership must be an object." };
    const m = body.membership as Record<string, unknown>;
    const rules: Partial<MembershipRules> = {};
    const limits: Record<keyof MembershipRules, [number, string]> = {
      weekdayAdvanceHours: [168, "Weekday notice must be 0–168 hours."],
      weekendAdvanceHours: [168, "Weekend notice must be 0–168 hours."],
      carryOverGraceDays: [90, "Carry-over days must be 0–90."],
    };
    for (const key of Object.keys(limits) as (keyof MembershipRules)[]) {
      if (m[key] === undefined) continue;
      const [max, error] = limits[key];
      if (!isInt(m[key]) || (m[key] as number) < 0 || (m[key] as number) > max) return { ok: false, error };
      rules[key] = m[key] as number;
    }
    if (Object.keys(rules).length > 0) out.membership = rules;
  }

  if (body.faqs !== undefined) {
    if (body.faqs === null) {
      out.faqs = null;
    } else {
      if (!Array.isArray(body.faqs) || body.faqs.length > 30) return { ok: false, error: "FAQs must be a list (up to 30)." };
      const faqs: Faq[] = [];
      for (const raw of body.faqs) {
        const f = (raw ?? {}) as Record<string, unknown>;
        const question = typeof f.question === "string" ? f.question.trim() : "";
        const answer = typeof f.answer === "string" ? f.answer.trim() : "";
        if (!question && !answer) continue;
        if (question.length < 3 || question.length > 200) return { ok: false, error: "Each question must be 3–200 characters." };
        if (answer.length < 3 || answer.length > 1500) return { ok: false, error: "Each answer must be 3–1500 characters." };
        faqs.push({ question, answer });
      }
      out.faqs = faqs.length ? faqs : null;
    }
  }

  if (body.removeSports !== undefined) {
    const list = body.removeSports;
    if (!Array.isArray(list) || !list.every(isSportCode)) return { ok: false, error: "removeSports must be a list of sport codes." };
    if (list.some((s) => (BUILT_IN_SPORTS as readonly string[]).includes(s))) {
      return { ok: false, error: "Built-in sports can't be removed. Turn off \"Show in app\" instead." };
    }
    out.removeSports = [...new Set(list)];
  }

  if (body.sports !== undefined) {
    if (!Array.isArray(body.sports)) return { ok: false, error: "sports must be a list." };
    const seen = new Set<string>();
    out.sports = [];
    for (const raw of body.sports) {
      if (!raw || typeof raw !== "object") return { ok: false, error: "Each sport must be an object." };
      const s = raw as Record<string, unknown>;
      const sport = s.sport as SportKey;
      if (!isSportCode(sport)) return { ok: false, error: `Unknown sport: ${String(s.sport)}` };
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
        if (typeof s.imageUrl !== "string" || (s.imageUrl.trim() !== "" && !/^(https:\/\/|\/)/.test(s.imageUrl.trim()))) {
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
  // Taking out added sports: only when no court uses them.
  if (patch.removeSports?.length) {
    const used = await Court.distinct("type", { type: { $in: patch.removeSports } });
    if (used.length) {
      const names = used.map((code: string) => sports.find((s) => s.sport === code)?.label ?? code);
      return { ok: false, error: `Move or delete the courts for ${names.join(", ")} first (Admin → Courts).` };
    }
    for (const code of patch.removeSports) {
      const i = sports.findIndex((s) => s.sport === code);
      if (i >= 0) sports.splice(i, 1);
    }
  }
  // A sport that isn't saved yet is being added: it needs a name.
  for (const change of patch.sports ?? []) {
    if (patch.removeSports?.includes(change.sport)) continue;
    if (sports.some((s) => s.sport === change.sport)) continue;
    if (!change.label) return { ok: false, error: `Give the new sport ${change.sport} a name.` };
    const order = Math.max(0, ...sports.map((s) => s.sortOrder)) + 1;
    sports.push({ ...newSportDefaults(change.sport, change.label, order), ...change });
  }
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
    membership: { ...current.membership, ...(patch.membership || {}) },
    faqs: patch.faqs !== undefined ? patch.faqs : current.faqs,
    updatedBy,
  };

  await AppSettings.findOneAndUpdate(
    { key: "main" },
    { $set: next, $setOnInsert: { key: "main" } },
    { upsert: true, new: true, runValidators: true },
  );
  // Sport photos that were replaced or removed: delete them if nothing uses them now.
  await deleteUnusedPhotos(current.sports.map((s) => s.imageUrl).filter((u) => !next.sports.some((n) => n.imageUrl === u)));
  return { ok: true, settings: resolveAppSettings(next) };
}
