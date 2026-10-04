import { bffFetch } from "@/lib/bff/client";
import type {
  CreateBookingInput,
  ExtendBookingInput,
  GetAvailableStartTimesInput,
  GetBookingsPaginatedInput,
  UpdateBookingInput,
  AvailableStartTimeQuote,
} from "@/app/actions/bookings";
import type { Booking } from "@/types";
import type { AnalyticsStats } from "@/components/admin/analytics/analyticsHelpers";

export type ActionResult<T = Record<string, unknown>> = {
  success: boolean;
  error?: string;
} & T;

export type ExtensionAvailabilityResult = ActionResult<{
  canExtend30?: boolean;
  canExtend60?: boolean;
  hasAnyOption?: boolean;
}>;

export async function fetchBookingsPaginated(input: GetBookingsPaginatedInput) {
  const params = new URLSearchParams({
    mode: "paginated",
    page: String(input.page),
    limit: String(input.limit),
  });
  if (input.search) params.set("search", input.search);
  if (input.dateRange?.from) params.set("dateFrom", input.dateRange.from);
  if (input.dateRange?.to) params.set("dateTo", input.dateRange.to);

  return bffFetch<{
    bookings: Booking[];
    totalCount: number;
    page?: number;
    limit?: number;
  }>(`/api/v1/admin/bookings?${params.toString()}`);
}

export async function fetchBookingById(bookingId: string) {
  const data = await bffFetch<{ booking: Booking }>(
    `/api/v1/admin/bookings?mode=one&bookingId=${encodeURIComponent(bookingId)}`,
  );
  return data.booking;
}

export type AnalyticsSummaryResponse = {
  stats: AnalyticsStats;
  lastRebuiltAt: string;
  nextRefreshAt: string;
  refreshed?: boolean;
  maxAgeMs?: number;
};

export async function fetchAnalyticsSummary(input?: {
  dateFrom?: string | null;
  dateTo?: string | null;
}) {
  const params = new URLSearchParams({ mode: "analytics" });
  if (input?.dateFrom) params.set("dateFrom", input.dateFrom);
  if (input?.dateTo) params.set("dateTo", input.dateTo);
  return bffFetch<AnalyticsSummaryResponse>(
    `/api/v1/admin/bookings?${params.toString()}`,
  );
}

/** @deprecated Prefer fetchBookingById / fetchAnalyticsSummary — capped list only. */
export async function fetchAllBookings() {
  const data = await bffFetch<{ bookings: Booking[] }>(
    "/api/v1/admin/bookings?mode=all",
  );
  return data.bookings;
}

export async function fetchAvailableStartTimes(
  input: GetAvailableStartTimesInput,
) {
  const params = new URLSearchParams({
    mode: "available-times",
    courtType: input.courtType,
    date: input.date,
    duration: String(input.duration),
  });
  if (input.excludeBookingId) {
    params.set("excludeBookingId", input.excludeBookingId);
  }
  const data = await bffFetch<{ startTimes: AvailableStartTimeQuote[] }>(
    `/api/v1/admin/bookings?${params.toString()}`,
  );
  return data.startTimes ?? [];
}

export async function fetchBookingExtensionAvailability(bookingId: string) {
  return bffFetch<ExtensionAvailabilityResult>(
    `/api/v1/admin/bookings?mode=extension&bookingId=${encodeURIComponent(bookingId)}`,
  );
}

export async function requestCreateBooking(input: CreateBookingInput) {
  return bffFetch<ActionResult<{ booking?: Booking }>>("/api/v1/admin/bookings", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function requestUpdateBooking(input: UpdateBookingInput) {
  return bffFetch<ActionResult<{ booking?: Booking }>>("/api/v1/admin/bookings", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function requestDeleteBooking(bookingId: string) {
  return bffFetch<ActionResult>(
    `/api/v1/admin/bookings?bookingId=${encodeURIComponent(bookingId)}`,
    { method: "DELETE" },
  );
}

export async function requestExtendBooking(input: ExtendBookingInput) {
  return bffFetch<ActionResult<{ booking?: Booking }>>("/api/v1/admin/bookings", {
    method: "POST",
    body: JSON.stringify({ action: "extend", ...input }),
  });
}
