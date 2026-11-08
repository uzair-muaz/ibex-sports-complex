/**
 * Closures on the booking timeline. Server-only.
 * Every free-time check adds these as if they were bookings.
 */
import connectDB from "@/lib/mongodb";
import Closure from "@/models/Closure";
import type { BookingSpan } from "@/lib/booking-overlap";
import { shiftDateKey } from "@/lib/date-time";
import { closureAppliesTo, closureSpan, closureText, pkDayStart } from "@/lib/closure-rules";

export type ClosureSpan = BookingSpan & { closureId: string; note: string };

type ClosureLean = { _id: unknown; courtIds: unknown[]; startsAt: Date; endsAt: Date; publicNote?: string };

/** Closures touching these venue days (plus a day either side, for times that cross midnight). */
async function closuresBetween(fromDateKey: string, toDateKey: string): Promise<ClosureLean[]> {
  await connectDB();
  return Closure.find({
    endsAt: { $gt: pkDayStart(shiftDateKey(fromDateKey, -1)) },
    startsAt: { $lt: pkDayStart(shiftDateKey(toDateKey, 2)) },
  })
    .select("courtIds startsAt endsAt publicNote")
    .lean() as Promise<ClosureLean[]>;
}

function toSpan(c: ClosureLean): ClosureSpan {
  return { ...closureSpan(c), closureId: String(c._id), note: closureText(c) };
}

const ids = (c: ClosureLean) => c.courtIds.map(String);

/** Closed times for each court, around one venue day (or a range of days). */
export async function closureSpansByCourt(
  courtIds: Array<string | { toString(): string }>,
  fromDateKey: string,
  toDateKey = fromDateKey,
): Promise<Map<string, ClosureSpan[]>> {
  const out = new Map<string, ClosureSpan[]>();
  const rows = await closuresBetween(fromDateKey, toDateKey);
  if (rows.length === 0) return out;
  for (const raw of courtIds) {
    const id = raw.toString();
    const list = rows.filter((c) => closureAppliesTo({ courtIds: ids(c) }, id)).map(toSpan);
    if (list.length) out.set(id, list);
  }
  return out;
}

/** Same, for one court. */
export async function closureSpansForCourt(courtId: string, dateKey: string): Promise<ClosureSpan[]> {
  return (await closureSpansByCourt([courtId], dateKey)).get(courtId) ?? [];
}
