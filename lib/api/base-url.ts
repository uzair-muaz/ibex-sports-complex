import { getBaseUrl } from "@/lib/utils";

/**
 * The address to put in full links we send to the app (photos, screenshot links).
 *
 * Staging and live: always the configured address (APP_URL), never the
 * request's Host header, so nobody can make us hand out links to their site.
 * Laptop (configured address is localhost): use the address the phone called,
 * so the Android emulator (10.0.2.2) and real phones on Wi-Fi get links that work.
 */
const LOCAL_BASE = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?\/?$/i;
const SAFE_HOST = /^([a-z0-9-]+(\.[a-z0-9-]+)*|\[[0-9a-f:]+\])(:\d{1,5})?$/i;

export function chooseBaseUrl(configured: string, host: string | null, proto: string | null): string {
  const base = configured.replace(/\/$/, "");
  if (!LOCAL_BASE.test(configured)) return base;
  const h = host?.split(",")[0].trim() ?? "";
  if (!h || !SAFE_HOST.test(h)) return base;
  const p = proto?.split(",")[0].trim() === "https" ? "https" : "http";
  return `${p}://${h}`;
}

/** Inside a request (route handler). Outside one (scripts, tests) it falls back to the configured address. */
export async function publicBaseUrl(): Promise<string> {
  const configured = getBaseUrl();
  try {
    const { headers } = await import("next/headers");
    const h = await headers();
    return chooseBaseUrl(configured, h.get("x-forwarded-host") ?? h.get("host"), h.get("x-forwarded-proto"));
  } catch {
    return configured.replace(/\/$/, "");
  }
}
