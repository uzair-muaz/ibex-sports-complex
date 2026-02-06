import type { CourtPricingPeriod, PricingLabel, CourtType } from "@/types";

// Minimal shape we need from a court-like object for pricing
export interface CourtLike {
  pricePerHour?: number;
  timeBasedPricingEnabled?: boolean;
  pricingPeriods?: CourtPricingPeriod[];
  type?: CourtType;
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

export function getPricePerHourForTime(
  court: CourtLike,
  hour: number
): { pricePerHour: number; label?: PricingLabel } {
  const hasPeriods =
    Array.isArray(court.pricingPeriods) && court.pricingPeriods.length > 0;
  const basePrice =
    !court.timeBasedPricingEnabled || !hasPeriods
      ? typeof court.pricePerHour === "number"
        ? court.pricePerHour
        : 0
      : 0;

  // For FUTSAL courts, prices are stored as "per 90 minutes", convert to "per hour"
  const isFutsal = court.type === "FUTSAL";
  const futsalMultiplier = isFutsal ? 60 / 90 : 1; // Convert 90-min price to hourly rate

  if (!court.timeBasedPricingEnabled || !hasPeriods) {
    return { pricePerHour: basePrice * futsalMultiplier };
  }

  const matching = (court.pricingPeriods || []).filter((period) => {
    if (typeof period.pricePerHour !== "number") return false;
    return isHourInPeriod(hour, period);
  });

  if (matching.length === 0) {
    return { pricePerHour: basePrice * futsalMultiplier };
  }

  // If multiple match, prefer the highest priced one (treat as peak)
  const chosen = matching.reduce((prev, curr) =>
    curr.pricePerHour > prev.pricePerHour ? curr : prev
  );

  return {
    pricePerHour: chosen.pricePerHour * futsalMultiplier,
    label: chosen.label,
  };
}

export function calculateOriginalPrice(
  court: CourtLike,
  startTime: number,
  duration: number
): { originalPrice: number } {
  if (!court || typeof startTime !== "number" || typeof duration !== "number") {
    return { originalPrice: 0 };
  }

  if (duration <= 0) {
    return { originalPrice: 0 };
  }

  // Duration is always a multiple of 0.5 hours
  const slots = Math.round(duration / 0.5);
  let total = 0;

  for (let i = 0; i < slots; i++) {
    const slotStart = startTime + i * 0.5;
    const { pricePerHour } = getPricePerHourForTime(court, slotStart);
    total += pricePerHour * 0.5;
  }

  // Keep minor decimals but avoid floating point noise
  const rounded = Number(total.toFixed(2));
  return { originalPrice: rounded };
}

