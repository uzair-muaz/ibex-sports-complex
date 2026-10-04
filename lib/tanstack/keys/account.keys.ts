export const accountKeys = {
  all: ["account"] as const,
  profile: () => [...accountKeys.all, "profile"] as const,
  bookings: () => [...accountKeys.all, "bookings"] as const,
  booking: (id: string) => [...accountKeys.all, "booking", id] as const,
  loyalty: () => [...accountKeys.all, "loyalty"] as const,
  membership: () => [...accountKeys.all, "membership"] as const,
  support: () => [...accountKeys.all, "support"] as const,
};
