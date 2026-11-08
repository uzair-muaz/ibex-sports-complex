import { calculateOriginalPrice, getBookingStartPricingLabel, getPricePerHourForTime, type CourtLike } from "@/lib/pricing-utils";
import { freeStartTimes, type BookingSpan } from "@/lib/booking-overlap";
import type { ResolvedAppSettings, SportRules } from "@/lib/app-settings";
import type { CourtFeature } from "@/models/Court";

/** Whole PKR, round half up (the one rounding rule for the mobile API). */
export function roundPkr(value: number): number {
  return Math.floor(Number(value) + 0.5);
}

/** "/images/x.jpg" → "https://host/images/x.jpg". Full links are kept. */
export function absoluteUrl(pathOrUrl: string | null | undefined, baseUrl: string): string | null {
  if (!pathOrUrl) return null;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${baseUrl.replace(/\/$/, "")}/${pathOrUrl.replace(/^\//, "")}`;
}

const SAMPLE_WEEKDAY = "2026-01-05"; // Monday
const SAMPLE_SATURDAY = "2026-01-03";

/** Cheapest hourly price over the week (Futsal is stored per 90 min; this is per hour). */
export function startingPricePerHour(court: CourtLike): number {
  let min = Infinity;
  for (const weekend of [false, true]) {
    for (let i = 0; i < 48; i++) {
      const { pricePerHour } = getPricePerHourForTime(court, i * 0.5, { weekend });
      if (Number.isFinite(pricePerHour) && pricePerHour < min) min = pricePerHour;
    }
  }
  return Number.isFinite(min) ? roundPkr(min) : 0;
}

/**
 * Cheapest price for a booking of `minutes` (the sport's shortest allowed length),
 * e.g. Futsal 5,000 for 90 minutes. Easier to show than a per-hour figure for
 * sports that are sold in 90-minute blocks.
 */
export function startingPriceFor(court: CourtLike, minutes: number): number {
  let min = Infinity;
  // A Monday and a Saturday, so weekday and weekend prices are both looked at.
  for (const sampleDate of [SAMPLE_WEEKDAY, SAMPLE_SATURDAY]) {
    for (let i = 0; i < 48; i++) {
      const { originalPrice } = calculateOriginalPrice(court, i * 0.5, minutes / 60, sampleDate);
      if (Number.isFinite(originalPrice) && originalPrice > 0 && originalPrice < min) min = originalPrice;
    }
  }
  return Number.isFinite(min) ? roundPkr(min) : 0;
}

/** Shortest booking length allowed for a sport (60 if unknown). */
export function shortestMinutes(rules?: SportRules): number {
  const list = rules?.durationsMinutes ?? [];
  return list.length ? Math.min(...list) : 60;
}

/**
 * The card line under a sport, e.g. "Indoor • Panoramic glass • LED lighting",
 * made from what the super admin set on that sport's courts. null if nothing is set.
 */
export function sportFeaturesText(courts: Array<{ isIndoor?: boolean; features?: CourtFeature[]; highlight?: CourtFeature | null }>): string | null {
  if (courts.length === 0) return null;
  const parts: string[] = [];
  const indoor = courts.filter((c) => c.isIndoor).length;
  if (indoor === courts.length) parts.push("Indoor");
  else if (indoor > 0) parts.push("Indoor & outdoor");
  const count = new Map<string, number>();
  for (const c of courts) {
    const labels = new Set([...(c.features ?? []), ...(c.highlight ? [c.highlight] : [])].map((f) => f.label?.trim()).filter(Boolean));
    for (const l of labels) count.set(l as string, (count.get(l as string) ?? 0) + 1);
  }
  const top = [...count.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 2).map(([l]) => l);
  parts.push(...top);
  return parts.length ? parts.join(" • ") : null;
}

export type CourtSource = CourtLike & {
  _id: { toString(): string };
  name: string;
  type: "PADEL" | "CRICKET" | "PICKLEBALL" | "FUTSAL";
  image?: string;
  description?: string;
  surfaceLabel?: string;
  isIndoor?: boolean;
  hasRacketRental?: boolean;
  features?: CourtFeature[];
  highlight?: CourtFeature | null;
};

export type MobileCourtFields = {
  id: string;
  sport: CourtSource["type"];
  imageUrl: string | null;
  surfaceLabel: string;
  isIndoor: boolean;
  hasRacketRental: boolean;
  startingPricePerHour: number;
  /** Cheapest price for the sport's shortest booking (e.g. Futsal 5,000 for 90 min). */
  startingPrice: number;
  startingPriceMinutes: number;
  features: CourtFeature[];
  highlight: CourtFeature | null;
  slotsOpenToday: number;
  hasPeakSlotsOpen: boolean;
};

/** App fields for one court. Today's bookings and venue "now" are passed in. */
export function mobileCourtFields(
  court: CourtSource,
  ctx: {
    baseUrl: string;
    sportRules?: SportRules;
    todayKey: string;
    fromHour: number;
    bookings: BookingSpan[];
  },
): MobileCourtFields {
  const durationHours = (ctx.sportRules?.defaultDurationMinutes ?? 60) / 60;
  const free = freeStartTimes(ctx.todayKey, durationHours, ctx.bookings, ctx.fromHour);

  return {
    id: court._id.toString(),
    sport: court.type,
    // The court's own photo, else the sport photo.
    imageUrl: absoluteUrl(court.image || ctx.sportRules?.imageUrl, ctx.baseUrl),
    surfaceLabel: court.surfaceLabel || "",
    isIndoor: !!court.isIndoor,
    hasRacketRental: !!court.hasRacketRental,
    startingPricePerHour: startingPricePerHour(court),
    startingPrice: startingPriceFor(court, shortestMinutes(ctx.sportRules)),
    startingPriceMinutes: shortestMinutes(ctx.sportRules),
    features: (court.features ?? []).map((f) => ({ key: f.key, label: f.label })),
    highlight: court.highlight?.key ? { key: court.highlight.key, label: court.highlight.label } : null,
    slotsOpenToday: free.length,
    hasPeakSlotsOpen: free.some((h) => getBookingStartPricingLabel(court, h) === "peak"),
  };
}

/** GET /sports item. courtCount and fromPricePerHour come from active courts. */
export function mobileSports(
  settings: ResolvedAppSettings,
  courts: CourtSource[],
  baseUrl: string,
  opts: { includeHidden?: boolean } = {},
) {
  return settings.sports
    .filter((s) => opts.includeHidden || s.showInApp)
    .map((s) => {
      const sportCourts = courts.filter((c) => c.type === s.sport);
      const prices = sportCourts.map((c) => startingPricePerHour(c)).filter((p) => p > 0);
      const minutes = shortestMinutes(s);
      const blockPrices = sportCourts.map((c) => startingPriceFor(c, minutes)).filter((p) => p > 0);
      return {
        sport: s.sport,
        label: s.label,
        showInApp: s.showInApp,
        imageUrl: absoluteUrl(s.imageUrl, baseUrl),
        badge: s.badge,
        courtCount: sportCourts.length,
        fromPricePerHour: prices.length ? Math.min(...prices) : null,
        fromPrice: blockPrices.length ? Math.min(...blockPrices) : null,
        fromPriceMinutes: minutes,
        featuresText: sportFeaturesText(sportCourts),
        booking: {
          durationsMinutes: s.durationsMinutes,
          defaultDurationMinutes: s.defaultDurationMinutes,
          bookingWindowDays: s.bookingWindowDays,
        },
      };
    });
}
