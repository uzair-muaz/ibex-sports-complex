import type { GetAvailableStartTimesInput, GetBookingsPaginatedInput } from "@/app/actions/bookings";

export const queryKeys = {
  bookings: {
    all: ["bookings"] as const,
    paginated: (input: GetBookingsPaginatedInput) =>
      [...queryKeys.bookings.all, "paginated", input] as const,
    list: () => [...queryKeys.bookings.all, "list"] as const,
    availableTimes: (input: GetAvailableStartTimesInput) =>
      [...queryKeys.bookings.all, "available-times", input] as const,
    extensionAvailability: (bookingId: string) =>
      [...queryKeys.bookings.all, "extension", bookingId] as const,
  },
  courts: {
    all: ["courts"] as const,
    list: () => [...queryKeys.courts.all, "list"] as const,
    byType: (type?: string) => [...queryKeys.courts.all, "by-type", type ?? "all"] as const,
  },
  users: {
    all: ["users"] as const,
    list: () => [...queryKeys.users.all, "list"] as const,
  },
  feedback: {
    all: ["feedback"] as const,
    list: () => [...queryKeys.feedback.all, "list"] as const,
  },
  discounts: {
    all: ["discounts"] as const,
    list: () => [...queryKeys.discounts.all, "list"] as const,
    detail: (id: string) => [...queryKeys.discounts.all, "detail", id] as const,
  },
} as const;
