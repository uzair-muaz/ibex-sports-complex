/**
 * Closures: times when courts can't be booked (maintenance, events, a day off).
 * Pure rules, safe for the browser and tests.
 */
import type { BookingSpan } from "@/lib/booking-overlap";

/** A closure as stored. courtIds empty = every court (the whole venue). */
export type ClosureLike = {
  courtIds: string[];
  startsAt: Date | string;
  endsAt: Date | string;
  publicNote?: string | null;
};

/** Longest closure in one go. */
export const MAX_CLOSURE_DAYS = 90;
export const DEFAULT_CLOSED_TEXT = "Closed at this time.";

const PK_OFFSET_MS = 5 * 60 * 60_000;
const HOUR_MS = 60 * 60_000;

/** Venue date key ("2026-11-12") for a moment. */
export function pkDateKey(at: Date | string): string {
  return new Date(new Date(at).getTime() + PK_OFFSET_MS).toISOString().slice(0, 10);
}

/** Start of a venue day as a moment. */
export function pkDayStart(dateKey: string): Date {
  return new Date(`${dateKey}T00:00:00+05:00`);
}

/** The closure as a "booking" on the timeline, so every free-time check can use it. */
export function closureSpan(c: Pick<ClosureLike, "startsAt" | "endsAt">): BookingSpan {
  const start = new Date(c.startsAt).getTime();
  const end = new Date(c.endsAt).getTime();
  const dateKey = pkDateKey(c.startsAt);
  const startTime = (start - pkDayStart(dateKey).getTime()) / HOUR_MS;
  return { date: dateKey, startTime, duration: (end - start) / HOUR_MS };
}

export function closureAppliesTo(c: Pick<ClosureLike, "courtIds">, courtId: string): boolean {
  return c.courtIds.length === 0 || c.courtIds.some((id) => String(id) === String(courtId));
}

export function closureText(c: Pick<ClosureLike, "publicNote">): string {
  return c.publicNote?.trim() || DEFAULT_CLOSED_TEXT;
}

export type ClosureInput = {
  courtIds: string[];
  startsAt: Date;
  endsAt: Date;
  reason: string;
  publicNote: string;
};

/** "2026-11-12T09:00:00+05:00" → Date, only on a half hour. */
function halfHour(v: unknown): Date | null {
  if (typeof v !== "string") return null;
  const ms = Date.parse(v);
  if (Number.isNaN(ms)) return null;
  return ms % (30 * 60_000) === 0 ? new Date(ms) : null;
}

/**
 * Check an admin form. partial = editing (only the fields sent change).
 * `existing` fills in the fields not sent when editing.
 */
export function validateClosureInput(
  body: unknown,
  opts: { partial?: boolean; existing?: ClosureInput; now?: Date } = {},
): { ok: true; value: ClosureInput } | { ok: false; error: string } {
  if (!body || typeof body !== "object") return { ok: false, error: "Nothing to save." };
  const b = body as Record<string, unknown>;
  const base = opts.existing;
  const now = opts.now ?? new Date();

  let courtIds = base?.courtIds ?? [];
  if (b.courtIds !== undefined || !opts.partial) {
    const list: unknown = b.courtIds ?? [];
    if (!Array.isArray(list) || !list.every((x) => typeof x === "string" && /^[a-f0-9]{24}$/i.test(x))) {
      return { ok: false, error: "Pick the courts, or leave empty for every court." };
    }
    courtIds = [...new Set(list as string[])];
  }

  let startsAt = base?.startsAt ?? null;
  if (b.startsAt !== undefined || !opts.partial) {
    startsAt = halfHour(b.startsAt);
    if (!startsAt) return { ok: false, error: "Start must be a date and time on the hour or half hour." };
  }
  let endsAt = base?.endsAt ?? null;
  if (b.endsAt !== undefined || !opts.partial) {
    endsAt = halfHour(b.endsAt);
    if (!endsAt) return { ok: false, error: "End must be a date and time on the hour or half hour." };
  }
  if (!startsAt || !endsAt) return { ok: false, error: "Start and end are needed." };
  if (endsAt <= startsAt) return { ok: false, error: "End must be after the start." };
  if (endsAt.getTime() - startsAt.getTime() > MAX_CLOSURE_DAYS * 24 * HOUR_MS) {
    return { ok: false, error: `A closure can be at most ${MAX_CLOSURE_DAYS} days. Add another for longer.` };
  }
  if (endsAt <= now) return { ok: false, error: "This time has already passed." };

  let reason = base?.reason ?? "";
  if (b.reason !== undefined || !opts.partial) {
    reason = typeof b.reason === "string" ? b.reason.trim() : "";
    if (reason.length < 3 || reason.length > 200) return { ok: false, error: "Write a reason for staff (3 to 200 letters)." };
  }
  let publicNote = base?.publicNote ?? "";
  if (b.publicNote !== undefined) {
    if (b.publicNote !== null && typeof b.publicNote !== "string") return { ok: false, error: "Customer note must be text." };
    publicNote = ((b.publicNote as string | null) ?? "").trim();
    if (publicNote.length > 200) return { ok: false, error: "Customer note can be at most 200 letters." };
  }
  return { ok: true, value: { courtIds, startsAt, endsAt, reason, publicNote } };
}
