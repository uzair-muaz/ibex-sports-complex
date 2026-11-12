/** Admin → Reports. Pure helpers, safe for the browser and tests. */

export const MAX_REPORT_DAYS = 366;
export const EXPORT_KINDS = ["bookings", "payments", "wallet", "points", "memberships"] as const;
export type ExportKind = (typeof EXPORT_KINDS)[number];

export const EXPORT_LABELS: Record<ExportKind, string> = {
  bookings: "Bookings",
  payments: "Payment proofs",
  wallet: "Wallet history",
  points: "Points history",
  memberships: "Membership sales",
};

export type ReportRange = { from: string; to: string };

function isRealDate(key: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return false;
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** ?from=YYYY-MM-DD&to=YYYY-MM-DD (both days included, Pakistan time). */
export function parseReportRange(from: unknown, to: unknown): { ok: true; range: ReportRange } | { ok: false; error: string } {
  if (typeof from !== "string" || typeof to !== "string" || !isRealDate(from) || !isRealDate(to)) {
    return { ok: false, error: "from and to must be dates (YYYY-MM-DD)." };
  }
  if (to < from) return { ok: false, error: "The end date is before the start date." };
  const days = (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000 + 1;
  if (days > MAX_REPORT_DAYS) return { ok: false, error: `Pick at most ${MAX_REPORT_DAYS} days.` };
  return { ok: true, range: { from, to } };
}

/** The range as moments: from the start of `from` to the end of `to`, Pakistan time. */
export function rangeMoments(r: ReportRange): { start: Date; end: Date } {
  const start = new Date(`${r.from}T00:00:00+05:00`);
  const end = new Date(new Date(`${r.to}T00:00:00+05:00`).getTime() + 86_400_000);
  return { start, end };
}

export type ReportBooking = {
  status: string;
  sport: string | null;
  source?: string | null;
  duration: number;
  originalPrice?: number | null;
  discountAmount?: number | null;
  discounts?: { name: string; amountSaved: number }[] | null;
  promoCode?: string | null;
  promoDiscountPkr?: number | null;
  loyaltyDiscountPkr?: number | null;
  membershipDiscountPkr?: number | null;
  membershipHoursUsed?: number | null;
  totalPrice?: number | null;
  amountReceivedOnline?: number | null;
  amountReceivedCash?: number | null;
  amountPaid?: number | null;
  walletCreditUsed?: number | null;
  refundAmount?: number | null;
  refundPaidBackPkr?: number | null;
};

const n = (v: number | null | undefined) => Math.round(Number(v ?? 0)) || 0;

type Row = { key: string; count: number; pkr: number };
function addTo(map: Map<string, Row>, key: string, pkr: number, count = 1) {
  const r = map.get(key) ?? { key, count: 0, pkr: 0 };
  r.count += count;
  r.pkr += pkr;
  map.set(key, r);
}
const sorted = (m: Map<string, Row>) => [...m.values()].sort((a, b) => b.pkr - a.pkr || b.count - a.count);

/**
 * Money from bookings in the range. Cancelled bookings are counted apart.
 * received = cash + online (+ older unsplit amounts) + wallet; due = total − received.
 */
export function summariseReportBookings(rows: ReportBooking[]) {
  const kept = rows.filter((b) => b.status !== "cancelled");
  const cancelled = rows.filter((b) => b.status === "cancelled");
  const bySport = new Map<string, { sport: string; count: number; hours: number; total: number; received: number }>();
  const bySource = new Map<string, Row>();
  const autoDiscounts = new Map<string, Row>();
  const promos = new Map<string, Row>();

  // unsplit = older bookings that only recorded one paid amount (not cash vs online).
  const t = { courtFees: 0, autoDiscounts: 0, promo: 0, points: 0, hours: 0, total: 0, online: 0, cash: 0, unsplit: 0, wallet: 0, due: 0, hoursUsed: 0 };
  for (const b of kept) {
    const online = n(b.amountReceivedOnline);
    const cash = n(b.amountReceivedCash);
    // Older bookings only have amountPaid.
    const paid = online + cash > 0 ? online + cash : n(b.amountPaid);
    const wallet = n(b.walletCreditUsed);
    const total = n(b.totalPrice);
    t.courtFees += n(b.originalPrice) || total;
    t.autoDiscounts += n(b.discountAmount);
    t.promo += n(b.promoDiscountPkr);
    t.points += n(b.loyaltyDiscountPkr);
    t.hours += n(b.membershipDiscountPkr);
    t.total += total;
    t.online += online;
    t.cash += cash;
    if (online + cash === 0) t.unsplit += paid;
    t.wallet += wallet;
    t.due += Math.max(0, total - paid - wallet);
    t.hoursUsed += Number(b.membershipHoursUsed ?? 0);

    const sport = b.sport ?? "Unknown";
    const s = bySport.get(sport) ?? { sport, count: 0, hours: 0, total: 0, received: 0 };
    s.count += 1;
    s.hours += Number(b.duration ?? 0);
    s.total += total;
    s.received += paid + wallet;
    bySport.set(sport, s);
    addTo(bySource, b.source === "app" ? "app" : "web", total);
    for (const d of b.discounts ?? []) addTo(autoDiscounts, d.name, n(d.amountSaved));
    if (b.promoCode) addTo(promos, b.promoCode, n(b.promoDiscountPkr));
  }

  return {
    count: kept.length,
    ...t,
    received: t.online + t.cash + t.unsplit + t.wallet,
    bySport: [...bySport.values()].sort((a, b) => b.total - a.total),
    bySource: sorted(bySource),
    autoDiscountUse: sorted(autoDiscounts),
    promoUse: sorted(promos),
    cancelled: {
      count: cancelled.length,
      toWallet: cancelled.reduce((s, b) => s + n(b.refundAmount), 0),
      paidBack: cancelled.reduce((s, b) => s + n(b.refundPaidBackPkr), 0),
    },
  };
}

/** Sum signed amounts by a key, e.g. wallet credits and debits by reason. */
export function sumBy<T>(rows: T[], key: (r: T) => string, value: (r: T) => number): Row[] {
  const m = new Map<string, Row>();
  for (const r of rows) addTo(m, key(r), value(r));
  return sorted(m);
}

/** One spreadsheet cell: quotes when needed, and stops formulas (=, +, -, @) running in Excel. */
export function csvCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  let s = v instanceof Date ? v.toISOString() : String(v);
  if (typeof v === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** A CSV file Excel opens correctly (with the UTF-8 mark at the start). */
export function toCsv(header: string[], rows: unknown[][]): string {
  const lines = [header, ...rows].map((r) => r.map(csvCell).join(","));
  return `﻿${lines.join("\r\n")}\r\n`;
}
