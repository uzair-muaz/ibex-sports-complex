/** Blocking customers. Pure helpers, safe for the browser and tests. */
import { normalizePakPhone } from "@/lib/phone";

export const BLOCKED_CODE = "ACCOUNT_BLOCKED";
export const BLOCKED_MESSAGE = "This account can't make bookings right now. Please contact IBEX.";

export function cleanBlockReason(v: unknown): string | null {
  const s = typeof v === "string" ? v.trim() : "";
  return s.length >= 3 && s.length <= 300 ? s : null;
}

/** The ways a phone may be saved ("+923…", "03…", "923…"), so a blocked number matches any of them. */
export function phoneVariants(raw: string | null | undefined): string[] {
  const p = normalizePakPhone(raw);
  if (!p) return [];
  const local = `0${p.slice(3)}`;
  return [p, local, p.slice(1)];
}
