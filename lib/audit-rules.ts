/** Audit log: who changed what, and when. Pure helpers, safe for the browser and tests. */

export const AUDIT_AREAS = [
  "settings",
  "courts",
  "discounts",
  "promo_codes",
  "membership_plans",
  "memberships",
  "wallet",
  "points",
  "bookings",
  "payments",
  "closures",
  "messages",
  "users",
] as const;
export type AuditArea = (typeof AUDIT_AREAS)[number];

export const AREA_LABELS: Record<AuditArea, string> = {
  settings: "App settings",
  courts: "Courts and prices",
  discounts: "Discounts",
  promo_codes: "Promo codes",
  membership_plans: "Membership plans",
  memberships: "Memberships and hours",
  wallet: "Wallet",
  points: "Points",
  bookings: "Bookings",
  payments: "Payments",
  closures: "Closures",
  messages: "Messages",
  users: "Staff and users",
};

export type AuditChange = { path: string; from: string; to: string };

/** Fields never stored in the log (secrets and noise). */
const HIDDEN = /(password|secret|token|hash|__v|updatedAt|createdAt)$/i;
const MAX_TEXT = 300;
const MAX_CHANGES = 60;

/** A value as short text for the log. */
export function auditValue(v: unknown): string {
  if (v === undefined || v === null || v === "") return "—";
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "object" && typeof (v as { toHexString?: unknown }).toHexString === "function") return String(v);
  const s = typeof v === "object" ? JSON.stringify(v) : String(v);
  return s.length > MAX_TEXT ? `${s.slice(0, MAX_TEXT)}…` : s;
}

function isPlain(v: unknown): v is Record<string, unknown> {
  return (
    !!v &&
    typeof v === "object" &&
    !Array.isArray(v) &&
    !(v instanceof Date) &&
    typeof (v as { toHexString?: unknown }).toHexString !== "function"
  );
}

/**
 * What changed between two versions, as "path: from → to".
 * Objects are compared field by field; lists as a whole. Only fields in
 * `after` are compared when `onlyAfterKeys` is set (for "change these fields" edits).
 */
export function diffChanges(
  before: unknown,
  after: unknown,
  opts: { onlyAfterKeys?: boolean } = {},
): AuditChange[] {
  const out: AuditChange[] = [];
  const walk = (a: unknown, b: unknown, path: string) => {
    if (out.length >= MAX_CHANGES) return;
    if (path && HIDDEN.test(path)) return;
    if (isPlain(a) && isPlain(b)) {
      const keys = opts.onlyAfterKeys && !path ? Object.keys(b) : [...new Set([...Object.keys(a), ...Object.keys(b)])];
      for (const k of keys.sort()) walk(a[k], b[k], path ? `${path}.${k}` : k);
      return;
    }
    if (isPlain(b) && (a === undefined || a === null)) {
      for (const k of Object.keys(b).sort()) walk(undefined, b[k], path ? `${path}.${k}` : k);
      return;
    }
    const from = auditValue(a);
    const to = auditValue(b);
    if (from !== to) out.push({ path: path || "value", from, to });
  };
  walk(before, after, "");
  return out;
}

/** "PKR 1,500" */
export const pkrText = (n: number) => `PKR ${Math.round(n).toLocaleString("en-PK")}`;
