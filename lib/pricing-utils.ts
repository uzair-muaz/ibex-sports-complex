import type { CourtPricingPeriod, PricingLabel, CourtType } from "@/types";
import { isWeekendDateKey } from "@/lib/membership-rules";

// Minimal shape we need from a court-like object for pricing
export interface CourtLike {
  pricePerHour?: number;
  /** Saturday and Sunday price. Empty = same as pricePerHour. */
  weekendPricePerHour?: number | null;
  timeBasedPricingEnabled?: boolean;
  pricingPeriods?: CourtPricingPeriod[];
  type?: CourtType;
}

function plainCourt(court: CourtLike | (CourtLike & { toObject?: (o?: object) => CourtLike })): CourtLike {
  if (court && typeof court === "object" && typeof (court as { toObject?: () => CourtLike }).toObject === "function") {
    return (court as { toObject: (o?: object) => CourtLike }).toObject({
      flattenMaps: true,
    });
  }
  return court as CourtLike;
}

/** A saved weekend price, or null when it is empty. */
function weekendRate(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** Price for one period: its weekend price on Sat/Sun when set, else its normal price. */
function periodRate(period: CourtPricingPeriod, weekend: boolean): number {
  const w = weekend ? weekendRate(period.weekendPricePerHour) : null;
  return w ?? Number(period.pricePerHour);
}

/**
 * Is the half hour starting `rawSlotStart` hours after midnight of `dateKey` on a weekend?
 * Slots past midnight (e.g. 24.5) belong to the next day. No date = weekday prices.
 */
export function isWeekendSlot(dateKey: string | null | undefined, rawSlotStart: number): boolean {
  if (!dateKey || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return false;
  const dayShift = Math.floor(rawSlotStart / 24);
  if (dayShift === 0) return isWeekendDateKey(dateKey);
  const [y, m, d] = dateKey.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + dayShift));
  const day = dt.getUTCDay();
  return day === 0 || day === 6;
}

function isHourInPeriod(hour: number, period: CourtPricingPeriod): boolean {
  if (period.allDay) {
    return true;
  }

  const start = period.startHour;
  const end = period.endHour;

  if (typeof start !== "number" || typeof end !== "number") {
    return false;
  }

  if (start === end) {
    return false;
  }

  if (start < end) {
    return hour >= start && hour < end;
  }

  return hour >= start || hour < end;
}

/** Peak [start,24)∪[0,end); afternoon off-peak [oStart,oEnd) with end<oStart → hours [end,oStart) have no period; price at off-peak. */
function afternoonOffPeakBlock(
  pricingPeriods: CourtPricingPeriod[] | undefined,
): CourtPricingPeriod | null {
  if (!Array.isArray(pricingPeriods)) return null;
  return (
    pricingPeriods.find(
      (p) =>
        p.label === "off_peak" &&
        typeof p.startHour === "number" &&
        typeof p.endHour === "number" &&
        p.startHour < p.endHour &&
        Number.isFinite(Number(p.pricePerHour)),
    ) ?? null
  );
}

function wrapPeakMorningBound(
  pricingPeriods: CourtPricingPeriod[] | undefined,
): number | null {
  if (!Array.isArray(pricingPeriods)) return null;
  const wrapPeak = pricingPeriods.find(
    (p) =>
      p.label === "peak" &&
      typeof p.startHour === "number" &&
      typeof p.endHour === "number" &&
      p.startHour > p.endHour,
  );
  return wrapPeak ? wrapPeak.endHour : null;
}

function isHourInMorningGapBeforeOffPeak(
  hour: number,
  morningPeakEnd: number,
  afternoonOffPeakStart: number,
): boolean {
  return hour >= morningPeakEnd && hour < afternoonOffPeakStart;
}

export function getPricePerHourForTime(
  court: CourtLike,
  hour: number,
  opts?: { weekend?: boolean },
): { pricePerHour: number; label?: PricingLabel } {
  const c = plainCourt(court);
  const weekend = Boolean(opts?.weekend);
  const hasPeriods =
    Array.isArray(c.pricingPeriods) && c.pricingPeriods.length > 0;
  const basePrice = (weekend ? weekendRate(c.weekendPricePerHour) : null) ?? Number(c.pricePerHour);
  const basePriceN = Number.isFinite(basePrice) ? basePrice : 0;

  const isFutsal = c.type === "FUTSAL";
  const futsalMultiplier = isFutsal ? 60 / 90 : 1;

  if (!c.timeBasedPricingEnabled || !hasPeriods) {
    return { pricePerHour: basePriceN * futsalMultiplier };
  }

  const matching = (c.pricingPeriods || []).filter((period) => {
    const pph = periodRate(period, weekend);
    if (!Number.isFinite(pph)) return false;
    return isHourInPeriod(hour, period);
  });

  if (matching.length === 0) {
    const afternoonOff = afternoonOffPeakBlock(c.pricingPeriods);
    const morningEnd = wrapPeakMorningBound(c.pricingPeriods);
    if (
      afternoonOff &&
      typeof morningEnd === "number" &&
      isHourInMorningGapBeforeOffPeak(hour, morningEnd, afternoonOff.startHour)
    ) {
      const pph = periodRate(afternoonOff, weekend);
      if (Number.isFinite(pph)) {
        return {
          pricePerHour: pph * futsalMultiplier,
          label: "off_peak",
        };
      }
    }
    return { pricePerHour: basePriceN * futsalMultiplier };
  }

  const chosen = matching.reduce((prev, curr) =>
    periodRate(curr, weekend) > periodRate(prev, weekend) ? curr : prev,
  );

  const chosenRate = periodRate(chosen, weekend);
  return {
    pricePerHour: (Number.isFinite(chosenRate) ? chosenRate : 0) * futsalMultiplier,
    label: chosen.label,
  };
}

/** Label for the first slot of a booking (used for peak/off-peak discount rules). */
export function getBookingStartPricingLabel(
  court: CourtLike,
  startTime: number,
): PricingLabel | undefined {
  const hour = ((startTime % 24) + 24) % 24;
  return getPricePerHourForTime(court, hour).label;
}

/** Court fee before discounts. Pass the booking date so Sat/Sun use weekend prices. */
export function calculateOriginalPrice(
  court: CourtLike,
  startTime: number,
  duration: number,
  dateKey?: string | null,
): { originalPrice: number } {
  const { total } = calculatePeakOffPeakNeutralSplit(court, startTime, duration, dateKey);
  return { originalPrice: total };
}

/** Money in each tier for proportional discounts (neutral = no peak/off label). */
export function calculatePeakOffPeakNeutralSplit(
  court: CourtLike,
  startTime: number,
  duration: number,
  dateKey?: string | null,
): {
  total: number;
  peakAmount: number;
  offPeakAmount: number;
  neutralAmount: number;
} {
  const c = plainCourt(court);
  if (!c || typeof startTime !== "number" || typeof duration !== "number") {
    return { total: 0, peakAmount: 0, offPeakAmount: 0, neutralAmount: 0 };
  }

  if (duration <= 0) {
    return { total: 0, peakAmount: 0, offPeakAmount: 0, neutralAmount: 0 };
  }

  const slots = Math.round(duration / 0.5);
  let peakAmount = 0;
  let offPeakAmount = 0;
  let neutralAmount = 0;

  for (let i = 0; i < slots; i++) {
    const rawSlotStart = startTime + i * 0.5;
    const slotStart = ((rawSlotStart % 24) + 24) % 24;
    const { pricePerHour, label } = getPricePerHourForTime(c, slotStart, {
      weekend: isWeekendSlot(dateKey, rawSlotStart),
    });
    const slotTotal = pricePerHour * 0.5;
    if (label === "peak") {
      peakAmount += slotTotal;
    } else if (label === "off_peak") {
      offPeakAmount += slotTotal;
    } else {
      neutralAmount += slotTotal;
    }
  }

  const total = Number((peakAmount + offPeakAmount + neutralAmount).toFixed(2));
  return {
    total,
    peakAmount: Number(peakAmount.toFixed(2)),
    offPeakAmount: Number(offPeakAmount.toFixed(2)),
    neutralAmount: Number(neutralAmount.toFixed(2)),
  };
}
