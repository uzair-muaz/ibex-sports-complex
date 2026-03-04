import { formatLocalDate } from "./utils";

export type DateRange = {
  from: string;
  to: string;
};

export function getTodayRange(referenceDate: Date = new Date()): DateRange {
  const day = formatLocalDate(referenceDate);
  return { from: day, to: day };
}

export function getCurrentWeekRange(referenceDate: Date = new Date()): DateRange {
  const start = new Date(referenceDate);
  // Treat Monday as the first day of the week
  const day = start.getDay(); // 0 (Sun) - 6 (Sat)
  const diffToMonday = (day + 6) % 7; // 0 if Monday, 1 if Tuesday, ..., 6 if Sunday
  start.setDate(start.getDate() - diffToMonday);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  return {
    from: formatLocalDate(start),
    to: formatLocalDate(end),
  };
}

export function getCurrentMonthRange(referenceDate: Date = new Date()): DateRange {
  const start = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
  const end = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0);

  return {
    from: formatLocalDate(start),
    to: formatLocalDate(end),
  };
}

export function getCurrentYearRange(referenceDate: Date = new Date()): DateRange {
  const start = new Date(referenceDate.getFullYear(), 0, 1);
  const end = new Date(referenceDate.getFullYear(), 11, 31);

  return {
    from: formatLocalDate(start),
    to: formatLocalDate(end),
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

