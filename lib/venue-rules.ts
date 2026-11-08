/**
 * Venue contacts: defaults and small link helpers. Pure, so the website (browser)
 * and the server can both use it. The real values come from Admin → App Settings.
 */

export type VenueInfo = {
  name: string;
  branchName: string;
  hoursLabel: string;
  address: string;
  latitude: number;
  longitude: number;
  phone: string;
  whatsApp: string;
  email: string;
  /** "Open in Google Maps" link. Empty = built from latitude/longitude. */
  mapUrl: string | null;
  /** Social links. Empty = the icon is hidden. */
  instagramUrl: string | null;
  facebookUrl: string | null;
  facilityNote: string | null;
  weatherSummary: string | null;
};

/** Today's values, taken from what the website already shows. */
export const DEFAULT_VENUE: VenueInfo = {
  name: "IBEX Sports Complex",
  branchName: "IBEX Islamabad",
  hoursLabel: "Open 24 hours",
  address:
    "Ibex Sports Complex, Toot Stop Near Orchid Marquee, Wild Life Park Road, Main Islamabad Expy, Islamabad, 42700",
  latitude: 33.5849499,
  longitude: 73.1439709,
  phone: "+923255429429",
  whatsApp: "+923255429429",
  email: "ibexsportscomplex@gmail.com",
  mapUrl: "https://maps.app.goo.gl/4SJSmPKZHhHhF3tMA?g_st=ic",
  instagramUrl: "https://www.instagram.com/ibexsportscomplex?igsh=MXRhYnRhdGw0ZjlrcA==",
  facebookUrl: "https://www.facebook.com/share/1E1fH2mPGT/?mibextid=wwXIfr",
  facilityNote: null,
  weatherSummary: null,
};

/** "+92 325 5429429" → "tel:+923255429429" */
export function telHref(phone: string): string {
  const clean = phone.replace(/[^\d+]/g, "");
  return `tel:${clean}`;
}

/** "+92 325 5429429" → "https://wa.me/923255429429" (null if too short). */
export function waHref(phone: string | null | undefined): string | null {
  const digits = String(phone ?? "").replace(/\D/g, "");
  return digits.length >= 10 ? `https://wa.me/${digits}` : null;
}

/** "Open in Google Maps" link: the saved one, or one built from the pin. */
export function mapLink(v: Pick<VenueInfo, "mapUrl" | "latitude" | "longitude">): string {
  return v.mapUrl || `https://www.google.com/maps/search/?api=1&query=${v.latitude},${v.longitude}`;
}

/** The website's original map (shows the IBEX place card). Used while the pin is unchanged. */
const ORIGINAL_EMBED =
  "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3323.7842767507145!2d73.1439709!3d33.5849499!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x38dfed0d4fd052a7%3A0x36114e312659cf3a!2sIbex%20Sports%20Complex!5e0!3m2!1sen!2s!4v1768089209428!5m2!1sen!2s";

/** Map shown on the website. Follows the pin set in App Settings. */
export function mapEmbedUrl(v: Pick<VenueInfo, "latitude" | "longitude">): string {
  const same =
    Math.abs(v.latitude - DEFAULT_VENUE.latitude) < 1e-6 && Math.abs(v.longitude - DEFAULT_VENUE.longitude) < 1e-6;
  return same ? ORIGINAL_EMBED : `https://maps.google.com/maps?q=${v.latitude},${v.longitude}&z=16&output=embed`;
}

/** Links saved by the admin must be normal web links. */
export function isWebLink(text: string): boolean {
  try {
    const u = new URL(text);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}
