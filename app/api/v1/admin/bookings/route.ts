import { requireBffAdmin, bffOk, bffError } from "@/lib/bff/http";
import {
  getBookingsPaginated,
  getAllBookings,
  getBookingByIdForAdmin,
  getAnalyticsSummary,
  rebuildAnalyticsRollup,
  createBooking,
  updateBooking,
  deleteBooking,
  extendBooking,
  checkBookingExtensionAvailability,
  getAvailableStartTimes,
  type CreateBookingInput,
  type UpdateBookingInput,
  type ExtendBookingInput,
  type GetBookingsPaginatedInput,
  type GetAvailableStartTimesInput,
} from "@/app/actions/bookings";
import { createTrustedApiActor } from "@/lib/action-auth";

export async function GET(request: Request) {
  const gate = await requireBffAdmin(request);
  if (!gate.ok) return gate.response;
  const staffOpts = createTrustedApiActor(gate.user);

  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode") || "paginated";

  if (mode === "one") {
    const bookingId = searchParams.get("bookingId") || "";
    const result = await getBookingByIdForAdmin(bookingId, staffOpts);
    if (!result.success) return bffError(result.error || "Failed", 404, request);
    return bffOk({ booking: result.booking }, request);
  }

  if (mode === "analytics") {
    const result = await getAnalyticsSummary(
      {
        dateFrom: searchParams.get("dateFrom"),
        dateTo: searchParams.get("dateTo"),
      },
      staffOpts,
    );
    if (!result.success) return bffError(result.error || "Failed", 400, request);
    return bffOk(
      {
        stats: result.stats,
        lastRebuiltAt: result.lastRebuiltAt,
        nextRefreshAt: result.nextRefreshAt,
        refreshed: result.refreshed,
        maxAgeMs: result.maxAgeMs,
      },
      request,
    );
  }

  if (mode === "rebuild-analytics") {
    const datesParam = searchParams.get("dates");
    const dates = datesParam
      ? datesParam.split(",").map((d) => d.trim()).filter(Boolean)
      : undefined;
    const result = await rebuildAnalyticsRollup({ dates }, staffOpts);
    if (!result.success) return bffError(result.error || "Failed", 400, request);
    return bffOk(result, request);
  }

  if (mode === "all") {
    const result = await getAllBookings(staffOpts);
    if (!result.success) return bffError(result.error || "Failed", 400, request);
    return bffOk({ bookings: result.bookings }, request);
  }

  if (mode === "available-times") {
    const input: GetAvailableStartTimesInput = {
      courtType: searchParams.get(
        "courtType",
      ) as GetAvailableStartTimesInput["courtType"],
      date: searchParams.get("date") || "",
      duration: Number(searchParams.get("duration") || 1),
      excludeBookingId: searchParams.get("excludeBookingId") || undefined,
    };
    const result = await getAvailableStartTimes(input);
    if (!result.success) return bffError(result.error || "Failed", 400, request);
    return bffOk({ startTimes: result.startTimes ?? [] }, request);
  }

  if (mode === "extension") {
    const bookingId = searchParams.get("bookingId") || "";
    const result = await checkBookingExtensionAvailability(bookingId, staffOpts);
    return bffOk(result, request);
  }

  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const input: GetBookingsPaginatedInput = {
    page: Number(searchParams.get("page") || 1),
    limit: Number(searchParams.get("limit") || 20),
    search: searchParams.get("search") || undefined,
    dateRange:
      dateFrom && dateTo
        ? { from: dateFrom, to: dateTo }
        : null,
  };

  const result = await getBookingsPaginated(input, staffOpts);
  if (!result.success) return bffError(result.error || "Failed", 400, request);
  return bffOk({
    bookings: result.bookings,
    totalCount: result.totalCount ?? 0,
    page: result.page,
    limit: result.limit,
  });
}

export async function POST(request: Request) {
  const gate = await requireBffAdmin(request);
  if (!gate.ok) return gate.response;
  const staffOpts = createTrustedApiActor(gate.user);

  const body = await request.json();
  const action = body?.action as string | undefined;

  if (action === "extend") {
    const result = await extendBooking(body as ExtendBookingInput, staffOpts);
    if (!result.success) return bffError(result.error || "Failed", 400, request);
    return bffOk(result, request);
  }

  if (action === "rebuild-analytics") {
    const result = await rebuildAnalyticsRollup(
      { dates: body?.dates as string[] | undefined },
      staffOpts,
    );
    if (!result.success) return bffError(result.error || "Failed", 400, request);
    return bffOk(result, request);
  }

  const result = await createBooking(body as CreateBookingInput);
  if (!result.success) return bffError(result.error || "Failed", 400, request);
  return bffOk(result, request);
}

export async function PATCH(request: Request) {
  const gate = await requireBffAdmin(request);
  if (!gate.ok) return gate.response;
  const staffOpts = createTrustedApiActor(gate.user);

  const body = (await request.json()) as UpdateBookingInput;
  const result = await updateBooking(body, staffOpts);
  if (!result.success) return bffError(result.error || "Failed", 400, request);
  return bffOk(result, request);
}

export async function DELETE(request: Request) {
  const gate = await requireBffAdmin(request);
  if (!gate.ok) return gate.response;
  const staffOpts = createTrustedApiActor(gate.user);

  const { searchParams } = new URL(request.url);
  const bookingId = searchParams.get("bookingId") || "";
  const result = await deleteBooking(bookingId, staffOpts);
  if (!result.success) return bffError(result.error || "Failed", 400, request);
  return bffOk(result, request);
}

export async function OPTIONS(request: Request) {
  const { apiOptions } = await import("@/lib/api/response");
  return apiOptions(request);
}
