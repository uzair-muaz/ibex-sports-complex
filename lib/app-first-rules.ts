import { shiftDateKey } from "@/lib/date-time";
import type { AppFirstRules } from "@/lib/app-settings";

/**
 * Rules that give the app extra benefits (App Settings → App first).
 * Pure and browser-safe, so the website, the server and tests share them.
 */

/** Does a booking made here earn points? Website and staff bookings don't when points are app-only. */
export function earnsPoints(rules: Pick<AppFirstRules, "pointsAppOnly">, source: string | null | undefined): boolean {
  return !rules.pointsAppOnly || source === "app";
}

/** Last day the website can book (YYYY-MM-DD), or null when there is no website limit. */
export function websiteLastDay(
  rules: Pick<AppFirstRules, "websiteWindowOn" | "websiteBookingWindowDays">,
  todayKey: string,
): string | null {
  if (!rules.websiteWindowOn) return null;
  return shiftDateKey(todayKey, Math.max(1, rules.websiteBookingWindowDays) - 1);
}

/** Plain-words error when a website customer picks a day too far ahead, else null. */
export function websiteWindowError(
  rules: Pick<AppFirstRules, "websiteWindowOn" | "websiteBookingWindowDays">,
  dateKey: string,
  todayKey: string,
  appDays?: number | null,
): string | null {
  const last = websiteLastDay(rules, todayKey);
  if (!last || dateKey <= last) return null;
  const days = rules.websiteBookingWindowDays;
  const inApp = appDays && appDays > days ? ` In the IBEX app you can book up to ${appDays} days ahead.` : " Use the IBEX app to book further ahead.";
  return `On the website you can book up to ${days} day${days === 1 ? "" : "s"} ahead.${inApp}`;
}

/** Message shown on the website when points are app-only. */
export const POINTS_APP_ONLY_TEXT = "Points can be used only in the IBEX app. Book in the app to use and earn points.";
