import connectDB from "@/lib/mongodb";
import Booking from "@/models/Booking";
import { apiOk, apiError, apiOptions } from "@/lib/api/response";
import { getCourts } from "@/app/actions/courts";
import { getAppSettings } from "@/lib/app-settings";
import { mobileCourtFields, type CourtSource } from "@/lib/api/catalog";
import { closureSpansByCourt } from "@/lib/closures";
import { pakistanNow, type BookingSpan } from "@/lib/booking-overlap";
import { shiftDateKey } from "@/lib/date-time";
import { publicBaseUrl } from "@/lib/api/base-url";

type Sport = "PADEL" | "CRICKET" | "PICKLEBALL" | "FUTSAL";
const SPORTS: Sport[] = ["PADEL", "CRICKET", "PICKLEBALL", "FUTSAL"];
const ACTIVE_STATUSES = ["pending_payment", "confirmed", "completed"];

/**
 * Public courts catalog for web + Flutter.
 * Filter: ?sport=PADEL (app) or ?type=PADEL (website). Each court keeps its
 * original fields for the website, plus the app's fields (id, sport, imageUrl,
 * surfaceLabel, features, startingPricePerHour, slotsOpenToday, …).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const raw = (searchParams.get("sport") || searchParams.get("type") || "").toUpperCase();
  if (raw && !SPORTS.includes(raw as Sport)) {
    return apiError("Unknown sport", 400, request, { code: "VALIDATION_ERROR" });
  }

  const result = await getCourts((raw as Sport) || undefined);
  if (!result.success) {
    return apiError(result.error || "Failed to load courts", 400, request);
  }

  try {
    await connectDB();
    const courts = result.courts as Array<CourtSource & Record<string, unknown>>;
    const settings = await getAppSettings();
    const now = pakistanNow();

    // Bookings touching today: yesterday's late games can run past midnight,
    // and tonight's late starts can run into tomorrow's early bookings.
    const bookings = courts.length
      ? await Booking.find({
          courtId: { $in: courts.map((c) => c._id.toString()) },
          date: {
            $in: [shiftDateKey(now.dateKey, -1), now.dateKey, shiftDateKey(now.dateKey, 1)],
          },
          status: { $in: ACTIVE_STATUSES },
        })
          .select("courtId date startTime duration")
          .lean()
      : [];
    const byCourt = new Map<string, BookingSpan[]>();
    // Closed times count as taken for "next free time".
    if (courts.length) {
      for (const [id, spans] of await closureSpansByCourt(courts.map((c) => c._id.toString()), now.dateKey)) {
        byCourt.set(id, [...spans]);
      }
    }
    for (const b of bookings) {
      const key = String(b.courtId);
      const list = byCourt.get(key) ?? [];
      list.push({ date: b.date, startTime: b.startTime, duration: b.duration });
      byCourt.set(key, list);
    }

    const baseUrl = await publicBaseUrl();
    const enriched = courts.map((court) => ({
      ...court,
      ...mobileCourtFields(court, {
        baseUrl,
        sportRules: settings.sports.find((s) => s.sport === court.type),
        todayKey: now.dateKey,
        fromHour: now.nextStartHour,
        bookings: byCourt.get(court._id.toString()) ?? [],
      }),
    }));

    return apiOk({ courts: enriched }, request, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch (err) {
    console.error("GET /api/v1/courts:", err);
    return apiError("Failed to load courts", 500, request, { code: "SERVER_ERROR" });
  }
}

export async function OPTIONS(request: Request) {
  return apiOptions(request);
}
