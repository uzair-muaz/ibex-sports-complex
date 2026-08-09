import type {
  GetAvailableStartTimesInput,
  GetBookingsPaginatedInput,
} from "@/app/actions/bookings";

export const bookingKeys = {
  all: ["bookings"] as const,
  paginated: (input: GetBookingsPaginatedInput) =>
    [...bookingKeys.all, "paginated", input] as const,
  list: () => [...bookingKeys.all, "list"] as const,
  availableTimes: (input: GetAvailableStartTimesInput) =>
    [...bookingKeys.all, "available-times", input] as const,
  extensionAvailability: (bookingId: string) =>
    [...bookingKeys.all, "extension", bookingId] as const,
};
