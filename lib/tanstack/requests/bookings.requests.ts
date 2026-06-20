import {
  checkBookingExtensionAvailability,
  createBooking,
  deleteBooking,
  extendBooking,
  getAllBookings,
  getAvailableStartTimes,
  getBookingsPaginated,
  type CreateBookingInput,
  type ExtendBookingInput,
  type GetAvailableStartTimesInput,
  type GetBookingsPaginatedInput,
  type UpdateBookingInput,
  updateBooking,
} from "@/app/actions/bookings";
import type { Booking } from "@/types";

export async function fetchBookingsPaginated(input: GetBookingsPaginatedInput) {
  const result = await getBookingsPaginated(input);
  if (!result.success) {
    throw new Error(result.error ?? "Failed to fetch bookings");
  }
  return {
    bookings: result.bookings as Booking[],
    totalCount: result.totalCount ?? 0,
    page: result.page,
    limit: result.limit,
  };
}

export async function fetchAllBookings() {
  const result = await getAllBookings();
  if (!result.success) {
    throw new Error(result.error ?? "Failed to fetch bookings");
  }
  return result.bookings as Booking[];
}

export async function fetchAvailableStartTimes(
  input: GetAvailableStartTimesInput,
) {
  const result = await getAvailableStartTimes(input);
  if (!result.success) {
    throw new Error(result.error ?? "Failed to fetch available times");
  }
  return result.startTimes ?? [];
}

export async function fetchBookingExtensionAvailability(bookingId: string) {
  return checkBookingExtensionAvailability(bookingId);
}

export async function requestCreateBooking(input: CreateBookingInput) {
  return createBooking(input);
}

export async function requestUpdateBooking(input: UpdateBookingInput) {
  return updateBooking(input);
}

export async function requestDeleteBooking(bookingId: string) {
  return deleteBooking(bookingId);
}

export async function requestExtendBooking(input: ExtendBookingInput) {
  return extendBooking(input);
}
