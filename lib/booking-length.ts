import { getAppSettings, type SportRules } from "@/lib/app-settings";

/**
 * Booking lengths come from Admin → App Settings (per sport). Not a "use server" file.
 * Customers must pick one of the sport's lengths; staff may book any 30-minute
 * step from the shortest one (to fit odd requests).
 */
const fmt = (minutes: number) => (minutes % 60 === 0 ? `${minutes / 60} hour${minutes === 60 ? "" : "s"}` : `${minutes} minutes`);

export async function bookingLengthError(
  sport: string,
  durationHours: number,
  opts: { exactList: boolean },
): Promise<string | null> {
  const settings = await getAppSettings();
  const rules = settings.sports.find((s) => s.sport === (sport as SportRules["sport"]));
  if (!rules || rules.durationsMinutes.length === 0) return null;
  const minutes = Math.round(durationHours * 60);
  const allowed = [...rules.durationsMinutes].sort((a, b) => a - b);
  if (opts.exactList) {
    return allowed.includes(minutes) ? null : `${rules.label} can be booked for ${allowed.map(fmt).join(", ")}.`;
  }
  return minutes >= allowed[0] ? null : `Minimum booking time for ${rules.label} is ${fmt(allowed[0])}.`;
}
