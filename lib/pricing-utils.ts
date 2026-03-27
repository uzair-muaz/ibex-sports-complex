import type { CourtPricingPeriod, PricingLabel, CourtType } from "@/types";

// Minimal shape we need from a court-like object for pricing
export interface CourtLike {
  pricePerHour?: number;
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
    // Treat as disabled / invalid range
    return false;
  }

  // Simple case: same-day window (e.g. 12 -> 16)
  if (start < end) {
    return hour >= start && hour < end;
  }

  // Wraps past midnight (e.g. 16 -> 2)
  // Interpreted as [start, 24) U [0, end)
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
): { pricePerHour: number; label?: PricingLabel } {
  const c = plainCourt(court);
  const hasPeriods =
    Array.isArray(c.pricingPeriods) && c.pricingPeriods.length > 0;
  // Always keep a fallback base price for hours not covered by peak/off-peak periods.
  // This matters now that bookings are available for the full 24 hours.
  const basePrice = Number(c.pricePerHour);
  const basePriceN = Number.isFinite(basePrice) ? basePrice : 0;

  // For FUTSAL courts, prices are stored as "per 90 minutes", convert to "per hour"
  const isFutsal = c.type === "FUTSAL";
  const futsalMultiplier = isFutsal ? 60 / 90 : 1; // Convert 90-min price to hourly rate

  if (!c.timeBasedPricingEnabled || !hasPeriods) {
    return { pricePerHour: basePriceN * futsalMultiplier };
  }

  const matching = (c.pricingPeriods || []).filter((period) => {
    const pph = Number(period.pricePerHour);
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
      const pph = Number(afternoonOff.pricePerHour);
      if (Number.isFinite(pph)) {
        return {
          pricePerHour: pph * futsalMultiplier,
          label: "off_peak",
        };
      }
    }
    return { pricePerHour: basePriceN * futsalMultiplier };
  }

  // If multiple match, prefer the highest priced one (treat as peak)
  const chosen = matching.reduce((prev, curr) =>
    Number(curr.pricePerHour) > Number(prev.pricePerHour) ? curr : prev,
  );

  const chosenRate = Number(chosen.pricePerHour);
  return {
    pricePerHour: (Number.isFinite(chosenRate) ? chosenRate : 0) * futsalMultiplier,
    label: chosen.label,
  };
}

export function calculateOriginalPrice(
  court: CourtLike,
  startTime: number,
  duration: number,
): { originalPrice: number } {
  const c = plainCourt(court);
  if (!c || typeof startTime !== "number" || typeof duration !== "number") {
    return { originalPrice: 0 };
  }

  if (duration <= 0) {
    return { originalPrice: 0 };
  }

  // Duration is always a multiple of 0.5 hours
  const slots = Math.round(duration / 0.5);
  let total = 0;

  for (let i = 0; i < slots; i++) {
    // Allow bookings that span past midnight by wrapping into 0–24 range
    const rawSlotStart = startTime + i * 0.5;
    const slotStart = ((rawSlotStart % 24) + 24) % 24;
    const { pricePerHour } = getPricePerHourForTime(c, slotStart);
    total += pricePerHour * 0.5;
  }

  // Keep minor decimals but avoid floating point noise
  const rounded = Number(total.toFixed(2));
  return { originalPrice: rounded };
}
