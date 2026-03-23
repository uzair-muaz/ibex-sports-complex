import { formatLocalDate } from "./utils";
import {
  getBusinessDateKey,
  parseDateKeyUTC,
  shiftDateKey,
  formatDateKeyUTC,
} from "./date-time";

export type DateRange = {
  from: string;
  to: string;
};

export function getTodayRange(referenceDate: Date = new Date()): DateRange {
  const day = getBusinessDateKey(referenceDate);
  return { from: day, to: day };
}

export function getCurrentWeekRange(referenceDate: Date = new Date()): DateRange {
  const todayKey = getBusinessDateKey(referenceDate);
  const today = parseDateKeyUTC(todayKey);
  // Monday-first week using UTC date-only math
  const day = today.getUTCDay(); // 0 (Sun) - 6 (Sat)
  const diffToMonday = (day + 6) % 7;
  const start = new Date(today);
  start.setUTCDate(start.getUTCDate() - diffToMonday);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);

  return {
    from: formatDateKeyUTC(start),
    to: formatDateKeyUTC(end),
  };
}

export function getCurrentMonthRange(referenceDate: Date = new Date()): DateRange {
  const todayKey = getBusinessDateKey(referenceDate);
  const today = parseDateKeyUTC(todayKey);
  const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0));

  return {
    from: formatDateKeyUTC(start),
    to: formatDateKeyUTC(end),
  };
}

export function getCurrentYearRange(referenceDate: Date = new Date()): DateRange {
  const todayKey = getBusinessDateKey(referenceDate);
  const today = parseDateKeyUTC(todayKey);
  const start = new Date(Date.UTC(today.getUTCFullYear(), 0, 1));
  const end = new Date(Date.UTC(today.getUTCFullYear(), 11, 31));

  return {
    from: formatDateKeyUTC(start),
    to: formatDateKeyUTC(end),
  };
}

export function getRangeFromDates(
  from: Date | null | undefined,
  to: Date | null | undefined
): DateRange | null {
  if (!from || !to) return null;
  const fromStr = formatLocalDate(from);
  const toStr = formatLocalDate(to);
  if (fromStr > toStr) {
    // Swap if user selected in reverse
    return { from: toStr, to: fromStr };
  }
  return { from: fromStr, to: toStr };
}

export function isDateInRange(dateStr: string, range: DateRange): boolean {
  return dateStr >= range.from && dateStr <= range.to;
}

