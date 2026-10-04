import { type DayRuleInput } from "@/app/actions/discounts";
import {
  inferDiscountCategory,
  inferTierDiscountMode,
  isValidDayRule,
} from "@/lib/discount-utils";
import type {
  Discount,
  CourtType,
  DiscountPricingTier,
  DiscountCategory,
  TierDiscountMode,
  DayRuleRateMode,
} from "@/types";

export const COURT_TYPES: CourtType[] = [
  "PADEL",
  "CRICKET",
  "PICKLEBALL",
  "FUTSAL",
];

export type DayRuleForm = {
  days: number[];
  rateMode: DayRuleRateMode;
  type: "percentage" | "fixed";
  value: number;
  peakType: "percentage" | "fixed";
  peakValue: number | "";
  offPeakType: "percentage" | "fixed";
  offPeakValue: number | "";
};

export type DiscountFormState = {
  name: string;
  discountCategory: DiscountCategory;
  tierDiscountMode: TierDiscountMode;
  type: "percentage" | "fixed";
  value: number;
  peakType: "percentage" | "fixed";
  peakValue: number | "";
  offPeakType: "percentage" | "fixed";
  offPeakValue: number | "";
  courtTypes: CourtType[];
  minBookingHours: number | "";
  pricingTier: DiscountPricingTier;
  allDay: boolean;
  startHour: number;
  endHour: number;
  validFrom: Date | undefined;
  validUntil: Date | undefined;
  isActive: boolean;
  dayScheduleEnabled: boolean;
  dayRules: DayRuleForm[];
};

export const emptyDayRule = (): DayRuleForm => ({
  days: [],
  rateMode: "uniform",
  type: "percentage",
  value: 0,
  peakType: "percentage",
  peakValue: "",
  offPeakType: "percentage",
  offPeakValue: "",
});

export function isDayRuleFormSplit(rule: DayRuleForm): boolean {
  return rule.rateMode === "split";
}

export function isDayRuleFormValid(rule: DayRuleForm): boolean {
  if (!rule.days.length) return false;
  if (isDayRuleFormSplit(rule)) {
    return (
      (rule.peakValue !== "" && Number(rule.peakValue) > 0) ||
      (rule.offPeakValue !== "" && Number(rule.offPeakValue) > 0)
    );
  }
  return rule.value > 0;
}

export function dayRuleFormToInput(rule: DayRuleForm): DayRuleInput | null {
  if (!isDayRuleFormValid(rule)) return null;

  if (isDayRuleFormSplit(rule)) {
    const peakDiscount =
      rule.peakValue !== "" && Number(rule.peakValue) > 0
        ? { type: rule.peakType, value: Number(rule.peakValue) }
        : undefined;
    const offPeakDiscount =
      rule.offPeakValue !== "" && Number(rule.offPeakValue) > 0
        ? { type: rule.offPeakType, value: Number(rule.offPeakValue) }
        : undefined;
    const primary = peakDiscount ?? offPeakDiscount!;
    return {
      days: rule.days,
      rateMode: "split",
      type: primary.type,
      value: primary.value,
      peakDiscount,
      offPeakDiscount,
    };
  }

  return {
    days: rule.days,
    rateMode: "uniform",
    type: rule.type,
    value: rule.value,
  };
}

export function getDaysClaimedByOtherRules(
  rules: DayRuleForm[],
  excludeIndex: number,
): Set<number> {
  const claimed = new Set<number>();
  for (let i = 0; i < rules.length; i++) {
    if (i === excludeIndex) continue;
    for (const day of rules[i].days) claimed.add(day);
  }
  return claimed;
}

export function normalizeDayRulesFromDiscount(
  dayRules: Discount["dayRules"] | undefined,
): DayRuleForm[] {
  if (!Array.isArray(dayRules)) return [];
  return dayRules
    .filter(
      (r): r is NonNullable<(typeof dayRules)[number]> =>
        !!r && Array.isArray(r.days) && r.days.length > 0,
    )
    .map((r) => {
      const split =
        r.rateMode === "split" ||
        (r.peakDiscount != null && r.peakDiscount.value > 0) ||
        (r.offPeakDiscount != null && r.offPeakDiscount.value > 0);
      const pk = r.peakDiscount;
      const ok = r.offPeakDiscount;
      return {
        days: [...r.days]
          .map((d) => Number(d))
          .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
          .sort((a, b) => a - b),
        rateMode: split ? ("split" as const) : ("uniform" as const),
        type: (r.type === "fixed" ? "fixed" : "percentage") as
          | "percentage"
          | "fixed",
        value: Number(r.value) || 0,
        peakType: (pk?.type ?? "percentage") as "percentage" | "fixed",
        peakValue:
          pk != null && pk.value > 0 ? pk.value : ("" as number | ""),
        offPeakType: (ok?.type ?? "percentage") as "percentage" | "fixed",
        offPeakValue:
          ok != null && ok.value > 0 ? ok.value : ("" as number | ""),
      };
    })
    .filter((r) => isDayRuleFormValid(r));
}

export function discountToFormState(discount: Discount): DiscountFormState {
  const category = inferDiscountCategory(discount);
  const mode = inferTierDiscountMode(discount);
  const pk = discount.peakDiscount;
  const ok = discount.offPeakDiscount;
  const normalizedDayRules = normalizeDayRulesFromDiscount(discount.dayRules);

  return {
    name: discount.name,
    discountCategory: category,
    tierDiscountMode: mode,
    type: discount.type,
    value: discount.value,
    peakType: (pk?.type ?? "percentage") as "percentage" | "fixed",
    peakValue: (pk != null && pk.value > 0
      ? pk.value
      : "") as number | "",
    offPeakType: (ok?.type ?? "percentage") as "percentage" | "fixed",
    offPeakValue: (ok != null && ok.value > 0
      ? ok.value
      : "") as number | "",
    courtTypes: Array.isArray(discount.courtTypes) ? discount.courtTypes : [],
    minBookingHours: (discount.minBookingHours != null
      ? discount.minBookingHours
      : "") as number | "",
    pricingTier: discount.pricingTier ?? "any",
    allDay: discount.allDay ?? true,
    startHour: discount.startHour ?? 6,
    endHour: discount.endHour ?? 23,
    validFrom: new Date(discount.validFrom),
    validUntil: new Date(discount.validUntil),
    isActive: discount.isActive,
    dayScheduleEnabled: normalizedDayRules.length > 0,
    dayRules: normalizedDayRules,
  };
}

export function dayRulesForUpdate(
  editing: Discount | null,
  enabled: boolean,
  payload: DayRuleInput[] | null,
): DayRuleInput[] | null | undefined {
  if (enabled) return payload;
  if (editing && (editing.dayRules ?? []).some(isValidDayRule)) {
    return null;
  }
  return undefined;
}

export function createEmptyDiscountForm(): DiscountFormState {
  const today = new Date();
  const nextMonth = new Date(today);
  nextMonth.setMonth(nextMonth.getMonth() + 1);

  return {
    name: "",
    discountCategory: "flat",
    tierDiscountMode: "uniform",
    type: "percentage",
    value: 0,
    peakType: "percentage",
    peakValue: "",
    offPeakType: "percentage",
    offPeakValue: "",
    courtTypes: [],
    minBookingHours: "",
    pricingTier: "any",
    allDay: true,
    startHour: 6,
    endHour: 23,
    validFrom: today,
    validUntil: nextMonth,
    isActive: true,
    dayScheduleEnabled: false,
    dayRules: [],
  };
}

export function formatHourOption(i: number): string {
  return i === 0
    ? "12 AM"
    : i === 12
      ? "12 PM"
      : i < 12
        ? `${i} AM`
        : `${i - 12} PM`;
}

export const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => ({
  value: i,
  label: formatHourOption(i),
}));
