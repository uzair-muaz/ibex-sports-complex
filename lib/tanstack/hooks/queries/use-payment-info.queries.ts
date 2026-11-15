"use client";

import { useQuery } from "@tanstack/react-query";
import type { BankAccount } from "@/lib/app-settings";

/** How to pay the advance (Admin → App Settings). Same answer the app gets. */
export type PaymentInstructions = {
  minAdvancePercent: number;
  bankAccounts: BankAccount[];
  whatsAppNumber: string | null;
  maxFileSizeMb: number;
  transferNote: string | null;
  verificationNote: string | null;
  balanceNote: string | null;
};

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) throw new Error("Could not load the payment details");
  return (await res.json()) as T;
}

export function usePaymentInstructionsQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["public", "payment-instructions"],
    queryFn: () => getJson<PaymentInstructions>("/api/v1/payments/instructions"),
    enabled: options?.enabled ?? true,
    staleTime: 5 * 60_000,
  });
}

/** App Settings → App first, as the public policy endpoint gives it. */
export type PublicAppFirst = {
  pointsAppOnly: boolean;
  /** Days the website can book ahead (null = no website limit). */
  websiteBookingWindowDays: number | null;
  playStoreUrl: string | null;
  appStoreUrl: string | null;
};

/** cancellationNoticeMinutes: customers can cancel until this many minutes before the start. */
export function useBookingPolicyQuery() {
  return useQuery({
    queryKey: ["public", "booking-policy"],
    queryFn: () =>
      getJson<{ cancellationNoticeMinutes: number; appFirst?: PublicAppFirst }>("/api/v1/booking-policy"),
    staleTime: 60_000,
  });
}
