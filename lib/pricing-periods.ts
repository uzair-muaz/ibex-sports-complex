import type { CourtPricingPeriod } from "@/types";

/**
 * Checks a court's peak/off-peak times. Used by the court form (live warning)
 * and by the server before saving. Every half hour of the day must belong to
 * exactly one period: no gaps and no overlaps.
 */

const DAY = 24;

/** 18 → "6:00 PM", 0 or 24 → "12:00 AM". */
function clock(hour: number): string {
  const total = Math.round(hour * 60);
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

function name(p: CourtPricingPeriod): string {
  const kind = p.label === "peak" ? "Peak" : p.label === "off_peak" ? "Off-peak" : "Period";
  return `${kind} (${clock(p.startHour)} – ${clock(p.endHour)})`;
}

/** Half hours (0, 0.5, … 23.5) a period covers; wraps past midnight when end < start. */
function halfHours(start: number, end: number): number[] {
  const out: number[] = [];
  const stop = end > start ? end : end + DAY;
  for (let t = start; t < stop; t += 0.5) out.push(Number((t % DAY).toFixed(2)));
  return out;
}

/** An error in plain words, or null when the times are fine. */
export function checkPricingPeriods(periods: CourtPricingPeriod[]): string | null {
  if (!periods.length) return "Add at least one peak or off-peak time, or turn off peak/off-peak pricing.";

  const owner = new Map<number, number>();
  for (let i = 0; i < periods.length; i++) {
    const p = periods[i];
    const { startHour: start, endHour: end } = p;
    if (typeof start !== "number" || typeof end !== "number" || start < 0 || start > DAY || end < 0 || end > DAY) {
      return "Peak/off-peak times must be within one day (12:00 AM to 12:00 AM).";
    }
    const wholeDay = start === 0 && end === DAY;
    if (!wholeDay && start % DAY === end % DAY) {
      return `${name(p)} starts and ends at the same time. Choose a different end time.`;
    }
    for (const t of halfHours(start, end)) {
      const other = owner.get(t);
      if (other !== undefined) {
        const noonHint =
          end === 12 && end < start ? ` Did you mean 12:00 AM (midnight) instead of 12:00 PM (noon)?` : "";
        return `${name(periods[other])} and ${name(p)} overlap: both include ${clock(t)}. Each time can be only peak or off-peak.${noonHint}`;
      }
      owner.set(t, i);
    }
  }

  for (let t = 0; t < DAY; t += 0.5) {
    if (!owner.has(t)) {
      return `No price is set for ${clock(t)}. The peak and off-peak times together must cover the whole day, from 12:00 AM to 12:00 AM.`;
    }
  }
  return null;
}
