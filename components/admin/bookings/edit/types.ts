import type { Dayjs } from "dayjs";

export type BookingStatus =
  | "pending_payment"
  | "confirmed"
  | "cancelled"
  | "completed";

export type EditFormValues = {
  date: Dayjs;
  status: BookingStatus;
  userName: string;
  userEmail: string;
  userPhone: string;
  amountReceivedOnline: number;
  amountReceivedCash: number;
};

export type DurationPreset = {
  hours: number;
  label: string;
};
