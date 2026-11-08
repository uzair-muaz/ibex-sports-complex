/**
 * Sports are set by the super admin (App Settings → Sports). The four built-in
 * sports always exist; more can be added. Pure, so it is safe in the browser.
 */

/** The sports the venue started with. They can be hidden but not removed. */
export const BUILT_IN_SPORTS = ["PADEL", "PICKLEBALL", "FUTSAL", "CRICKET"] as const;

/** A sport's code, e.g. "PADEL" or "TABLE_TENNIS": capitals, digits and _, 2–24 long. */
export const SPORT_CODE_RE = /^[A-Z][A-Z0-9_]{1,23}$/;

export function isSportCode(v: unknown): v is string {
  return typeof v === "string" && SPORT_CODE_RE.test(v);
}

/** "Table Tennis" → "TABLE_TENNIS". null if nothing usable is left. */
export function sportCodeFromName(name: string): string | null {
  const code = name
    .normalize("NFKD")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase()
    .replace(/^[0-9_]+/, "")
    .slice(0, 24)
    .replace(/_+$/, "");
  return isSportCode(code) ? code : null;
}

/** "TABLE_TENNIS" → "Table Tennis" (used when no name is known). */
export function labelFromSportCode(code: string): string {
  return code
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

/** Name for a sport code, from a list of {sport, label}, else made from the code. */
export function sportLabel(code: string, sports?: Array<{ sport: string; label: string }> | null): string {
  return sports?.find((s) => s.sport === code)?.label ?? labelFromSportCode(code);
}

/** How many minutes a court's saved price is for. Futsal was always priced per 90-minute game. */
export function priceUnitMinutesFor(court: { type?: string; priceUnitMinutes?: number | null }): 60 | 90 {
  if (court.priceUnitMinutes === 60 || court.priceUnitMinutes === 90) return court.priceUnitMinutes;
  return court.type === "FUTSAL" ? 90 : 60;
}
