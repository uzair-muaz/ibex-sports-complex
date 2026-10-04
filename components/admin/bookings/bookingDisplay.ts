import type { Booking, Court } from "@/types";
import { formatTime12 } from "@/lib/utils";

export type DateFilter = "all" | "today" | "week" | "month" | "range";
export type SortColumn = keyof Booking | "courtName";

export const DATE_FILTER_OPTIONS: { label: string; value: DateFilter }[] = [
  { label: "All", value: "all" },
  { label: "Today", value: "today" },
  { label: "This Week", value: "week" },
  { label: "This Month", value: "month" },
  { label: "Custom Range", value: "range" },
];

export const STATUS_OPTIONS: { value: Booking["status"]; label: string }[] = [
  { value: "pending_payment", label: "Pending Payment" },
  { value: "confirmed", label: "Confirmed" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

export function getCourtName(booking: Booking): string {
  return typeof booking.courtId === "object" &&
    booking.courtId &&
    "name" in booking.courtId
    ? (booking.courtId as Court).name || "Unknown Court"
    : "Unknown Court";
}

export function formatStatusLabel(status: Booking["status"]): string {
  if (status === "pending_payment") return "Pending Payment";
  return (
    status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " ")
  );
}

export function getStatusTagColor(status: Booking["status"]): string {
  switch (status) {
    case "confirmed":
      return "cyan";
    case "pending_payment":
      return "gold";
    case "cancelled":
      return "red";
    case "completed":
      return "green";
    default:
      return "default";
  }
}

export function getEndTimeLabel(booking: Booking): string {
  const endTime =
    (((booking.startTime + booking.duration) % 24) + 24) % 24;
  const suffix =
    booking.startTime + booking.duration > 24 ? " (+1 day)" : "";
  return `${formatTime12(booking.startTime)} – ${formatTime12(endTime)}${suffix}`;
}

export function sortBookings(
  bookings: Booking[],
  sortColumn: SortColumn | null,
  sortDirection: "asc" | "desc",
): Booking[] {
  if (!sortColumn) return bookings;

  return [...bookings].sort((a, b) => {
    let aValue: unknown;
    let bValue: unknown;

    if (sortColumn === "courtName") {
      aValue = getCourtName(a);
      bValue = getCourtName(b);
    } else if (sortColumn === "createdAt" || sortColumn === "updatedAt") {
      const aDate = new Date(a[sortColumn]);
      const bDate = new Date(b[sortColumn]);
      const diff = aDate.getTime() - bDate.getTime();
      return sortDirection === "asc" ? diff : -diff;
    } else if (sortColumn === "date") {
      const aDateStr = a.date;
      const bDateStr = b.date;

      if (aDateStr === bDateStr) {
        const timeDiff = a.startTime - b.startTime;
        return sortDirection === "asc" ? timeDiff : -timeDiff;
      }

      if (aDateStr < bDateStr) return sortDirection === "asc" ? -1 : 1;
      if (aDateStr > bDateStr) return sortDirection === "asc" ? 1 : -1;
      return 0;
    } else {
      const key = sortColumn as keyof Booking;
      aValue = a[key];
      bValue = b[key];
    }

    if (typeof aValue === "string" && typeof bValue === "string") {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    if (typeof aValue === "number" && typeof bValue === "number") {
      return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
    }

    return 0;
  });
}
