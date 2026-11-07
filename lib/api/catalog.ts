import { getBookingStartPricingLabel, getPricePerHourForTime, type CourtLike } from "@/lib/pricing-utils";
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

/** Cheapest hourly price over the day (Futsal is stored per 90 min; this is per hour). */
export function startingPricePerHour(court: CourtLike): number {
  let min = Infinity;
  for (let i = 0; i < 48; i++) {
    const { pricePerHour } = getPricePerHourForTime(court, i * 0.5);
    if (Number.isFinite(pricePerHour) && pricePerHour < min) min = pricePerHour;
  }
  return Number.isFinite(min) ? roundPkr(min) : 0;
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
      return {
        sport: s.sport,
        label: s.label,
        showInApp: s.showInApp,
        imageUrl: absoluteUrl(s.imageUrl, baseUrl),
        badge: s.badge,
        courtCount: sportCourts.length,
        fromPricePerHour: prices.length ? Math.min(...prices) : null,
        booking: {
          durationsMinutes: s.durationsMinutes,
          defaultDurationMinutes: s.defaultDurationMinutes,
          bookingWindowDays: s.bookingWindowDays,
        },
      };
    });
}
