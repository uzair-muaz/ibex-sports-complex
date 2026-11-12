import { pkDayStart } from "@/lib/closure-rules";
import { toPkIso } from "@/lib/api/time";
import type { ClosureSpan } from "@/lib/closures";

export type ClosedTime = { start: string; end: string; note: string };

/** Closed times for the app: start, end (Pakistan time) and the customer note. One per closure. */
export function closedTimesView(spans: ClosureSpan[]): ClosedTime[] {
  const seen = new Set<string>();
  const out: ClosedTime[] = [];
  for (const s of spans) {
    if (seen.has(s.closureId)) continue;
    seen.add(s.closureId);
    const startMs = pkDayStart(s.date).getTime() + s.startTime * 3_600_000;
    out.push({
      start: toPkIso(startMs)!,
      end: toPkIso(startMs + s.duration * 3_600_000)!,
      note: s.note,
    });
  }
  return out.sort((a, b) => a.start.localeCompare(b.start));
}
