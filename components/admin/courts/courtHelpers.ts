import type { Court, CourtPricingPeriod, PricingLabel } from "@/types";

export type CourtFormState = {
  name: string;
  type: Court["type"];
  description: string;
  pricePerHour: number;
  isActive: boolean;
  timeBasedPricingEnabled: boolean;
  pricingPeriods: CourtPricingPeriod[];
};

export const COURT_TYPE_OPTIONS = [
  { value: "PADEL" as const, label: "Padel" },
  { value: "CRICKET" as const, label: "Cricket" },
  { value: "PICKLEBALL" as const, label: "Pickleball" },
  { value: "FUTSAL" as const, label: "Futsal" },
];

export const PRICING_LABEL_OPTIONS = [
  { value: "off_peak" as const, label: "Off-peak" },
  { value: "peak" as const, label: "Peak" },
];

export function createEmptyCourtForm(): CourtFormState {
  return {
    name: "",
    type: "PADEL",
    description: "",
    pricePerHour: 0,
    isActive: true,
    timeBasedPricingEnabled: false,
    pricingPeriods: [],
  };
}

export function courtToFormState(court: Court): CourtFormState {
  return {
    name: court.name,
    type: court.type,
    description: court.description,
    pricePerHour: court.pricePerHour,
    isActive: court.isActive,
    timeBasedPricingEnabled: court.timeBasedPricingEnabled ?? false,
    pricingPeriods: court.pricingPeriods ?? [],
  };
}

export function formatHourLabel(hour: number): string {
  const totalMinutes = Math.round(hour * 60);
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  const suffix = h >= 12 ? "PM" : "AM";
  const displayHour = h % 12 === 0 ? 12 : h % 12;
  const minuteStr = m.toString().padStart(2, "0");
  return `${displayHour}:${minuteStr} ${suffix}`;
}

export const TIME_OPTIONS: { value: number; label: string }[] = (() => {
  const options: { value: number; label: string }[] = [];
  for (let h = 0; h < 24; h++) {
    options.push({ value: h, label: formatHourLabel(h) });
    options.push({
      value: h + 0.5,
      label: formatHourLabel(h + 0.5),
    });
  }
  options.push({ value: 24, label: formatHourLabel(24) });
  return options;
})();

export function appendPricingPeriod(
  prev: CourtFormState,
  label: PricingLabel,
): CourtFormState {
  const last = prev.pricingPeriods[prev.pricingPeriods.length - 1];
  const defaultStart = last ? last.endHour : 0;
  let defaultEnd = defaultStart + 4;
  if (defaultEnd <= defaultStart) {
    defaultEnd = defaultStart + 1;
  }
  if (defaultEnd > 24) {
    defaultEnd = 24;
  }

  return {
    ...prev,
    timeBasedPricingEnabled: true,
    pricingPeriods: [
      ...prev.pricingPeriods,
      {
        label,
        startHour: defaultStart,
        endHour: defaultEnd,
        pricePerHour: prev.pricePerHour || 0,
        allDay: false,
      },
    ],
  };
}

export function patchPricingPeriod(
  prev: CourtFormState,
  index: number,
  updates: Partial<CourtPricingPeriod>,
): CourtFormState {
  const updated = [...prev.pricingPeriods];
  updated[index] = { ...updated[index], ...updates };
  return { ...prev, pricingPeriods: updated };
}

export function dropPricingPeriod(
  prev: CourtFormState,
  index: number,
): CourtFormState {
  const updated = [...prev.pricingPeriods];
  updated.splice(index, 1);
  return {
    ...prev,
    pricingPeriods: updated,
    timeBasedPricingEnabled:
      updated.length > 0 ? prev.timeBasedPricingEnabled : false,
  };
}

export function sortCourts(
  courts: Court[],
  sortColumn: keyof Court | null,
  sortDirection: "asc" | "desc",
): Court[] {
  return [...courts].sort((a, b) => {
    if (!sortColumn) return 0;

    let aValue: string | number | boolean = a[sortColumn] as
      | string
      | number
      | boolean;
    let bValue: string | number | boolean = b[sortColumn] as
      | string
      | number
      | boolean;

    if (typeof aValue === "string" && typeof bValue === "string") {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    if (typeof aValue === "number" && typeof bValue === "number") {
      return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
    }

    if (typeof aValue === "boolean" && typeof bValue === "boolean") {
      return sortDirection === "asc"
        ? aValue === bValue
          ? 0
          : aValue
            ? 1
            : -1
        : aValue === bValue
          ? 0
          : aValue
            ? -1
            : 1;
    }

    if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
    if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });
}
