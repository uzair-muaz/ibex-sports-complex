import { CourtType } from '@/models/Court';
import type {
  AppliedDiscount,
  Discount,
  DiscountDayRule,
  DiscountPricingTier,
  TierSliceDiscount,
  DiscountCategory,
  TierDiscountMode,
} from '@/types';
import { BUSINESS_TIMEZONE, toDateKeyInTimezone } from './date-time';
import {
  getBookingStartPricingLabel,
  calculatePeakOffPeakNeutralSplit,
  type CourtLike,
} from '@/lib/pricing-utils';

export interface DiscountInput {
  _id: string;
  name: string;
  type: 'percentage' | 'fixed';
  value: number;
  courtTypes: CourtType[];
  discountCategory?: DiscountCategory;
  tierDiscountMode?: TierDiscountMode;
  peakDiscount?: TierSliceDiscount;
  offPeakDiscount?: TierSliceDiscount;
  dayRules?: DiscountDayRule[];
  minBookingHours?: number;
  maxBookingHours?: number;
  pricingTier?: DiscountPricingTier;
  allDay: boolean;
  startHour: number;
  endHour: number;
  validFrom: string | Date;
  validUntil: string | Date;
  isActive: boolean;
}

export interface ApplicableDiscountContext {
  courtType: CourtType;
  court: CourtLike;
  duration: number;
  startTime: number;
  date: string;
}

export interface DiscountCalculationContext {
  court: CourtLike;
  startTime: number;
  duration: number;
  date: string;
}

/** 0=Sun … 6=Sat from YYYY-MM-DD booking date key */
export function getDayOfWeekFromDateKey(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map((x) => Number(x));
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export const WEEKDAY_DAYS = [1, 2, 3, 4, 5];
export const WEEKEND_DAYS = [0, 6];

export function hasDayRules(d: Pick<DiscountInput, 'dayRules'>): boolean {
  return (
    Array.isArray(d.dayRules) &&
    d.dayRules.some(
      (r) => Array.isArray(r?.days) && r.days.length > 0 && r.value > 0,
    )
  );
}

export function getMatchingDayRule(
  discount: Pick<DiscountInput, 'dayRules'>,
  date: string,
): DiscountDayRule | null {
  if (!hasDayRules(discount)) return null;
  const dow = getDayOfWeekFromDateKey(date);
  return discount.dayRules!.find((r) => r.days.includes(dow)) ?? null;
}

/** True when day-of-week slices apply instead of uniform type/value */
export function usesDaySplitDiscount(d: DiscountInput): boolean {
  return hasDayRules(d);
}

/** True when peak/off-peak slices apply (per-slot), not start-time tier filter */
export function usesTierSplitDiscount(d: DiscountInput): boolean {
  if (d.tierDiscountMode === 'split') return true;
  const pk = d.peakDiscount != null && d.peakDiscount.value > 0;
  const ok = d.offPeakDiscount != null && d.offPeakDiscount.value > 0;
  return pk || ok;
}

function savingsOnPortion(amount: number, slice?: TierSliceDiscount | null): number {
  if (!slice || amount <= 0 || slice.value <= 0) return 0;
  if (slice.type === 'percentage') {
    return Math.round(amount * (slice.value / 100));
  }
  return Math.min(slice.value, amount);
}

export function tierSplitAmountSaved(
  runningPrice: number,
  discount: DiscountInput,
  ctx: DiscountCalculationContext,
): number {
  const breakdown = calculatePeakOffPeakNeutralSplit(
    ctx.court,
    ctx.startTime,
    ctx.duration,
  );
  if (breakdown.total <= 0 || runningPrice <= 0) return 0;
  const peakPortion = runningPrice * (breakdown.peakAmount / breakdown.total);
  const offPortion = runningPrice * (breakdown.offPeakAmount / breakdown.total);
  return (
    savingsOnPortion(peakPortion, discount.peakDiscount) +
    savingsOnPortion(offPortion, discount.offPeakDiscount)
  );
}

/**
 * Filters discounts that are applicable for the given booking parameters
 */
export function getApplicableDiscounts(
  discounts: DiscountInput[],
  ctx: ApplicableDiscountContext,
): DiscountInput[] {
  const { courtType, court, duration, startTime, date } = ctx;
  const bookingDateKey = date;

  return discounts.filter((discount) => {
    if (!discount.isActive) return false;

    const validFromKey = toDateKeyInTimezone(
      new Date(discount.validFrom),
      BUSINESS_TIMEZONE,
    );
    const validUntilKey = toDateKeyInTimezone(
      new Date(discount.validUntil),
      BUSINESS_TIMEZONE,
    );
    if (bookingDateKey < validFromKey || bookingDateKey > validUntilKey) {
      return false;
    }

    const courtTypes = Array.isArray(discount.courtTypes) ? discount.courtTypes : [];
    if (courtTypes.length > 0 && !courtTypes.includes(courtType)) {
      return false;
    }

    const minH = discount.minBookingHours;
    const maxH = discount.maxBookingHours;
    if (minH != null && duration < minH) return false;
    if (maxH != null && duration > maxH) return false;

    if (!discount.allDay) {
      if (startTime < discount.startHour || startTime >= discount.endHour) {
        return false;
      }
    }

    if (usesTierSplitDiscount(discount)) {
      return true;
    }

    if (hasDayRules(discount)) {
      return getMatchingDayRule(discount, date) != null;
    }

    const tier = discount.pricingTier ?? 'any';
    if (tier !== 'any') {
      const label = getBookingStartPricingLabel(court, startTime);
      if (label !== tier) return false;
    }

    return true;
  });
}

/**
 * Calculates the discounted price applying all applicable discounts
 * Order: percentage discounts first, then fixed amounts
 * Multiple discounts stack (all are applied)
 */
export function calculateDiscountedPrice(
  originalPrice: number,
  applicableDiscounts: DiscountInput[],
  tierCtx?: DiscountCalculationContext,
): {
  finalPrice: number;
  discountAmount: number;
  appliedDiscounts: AppliedDiscount[];
} {
  if (applicableDiscounts.length === 0) {
    return {
      finalPrice: originalPrice,
      discountAmount: 0,
      appliedDiscounts: [],
    };
  }

  const sortKey = (d: DiscountInput): number => {
    if (usesTierSplitDiscount(d) || usesDaySplitDiscount(d)) return 1;
    return d.type === 'percentage' ? 0 : 2;
  };

  const sortedDiscounts = [...applicableDiscounts].sort((a, b) => {
    const ka = sortKey(a);
    const kb = sortKey(b);
    if (ka !== kb) return ka - kb;
    if (a.type === 'percentage' && b.type === 'fixed') return -1;
    if (a.type === 'fixed' && b.type === 'percentage') return 1;
    return 0;
  });

  let runningPrice = originalPrice;
  const appliedDiscounts: AppliedDiscount[] = [];

  for (const discount of sortedDiscounts) {
    let amountSaved: number;
    let appliedType = discount.type;
    let appliedValue = discount.value;

    if (usesTierSplitDiscount(discount) && tierCtx) {
      amountSaved = tierSplitAmountSaved(runningPrice, discount, tierCtx);
    } else if (usesDaySplitDiscount(discount) && tierCtx) {
      const rule = getMatchingDayRule(discount, tierCtx.date);
      if (!rule) continue;
      appliedType = rule.type;
      appliedValue = rule.value;
      if (rule.type === 'percentage') {
        amountSaved = Math.round(runningPrice * (rule.value / 100));
      } else {
        amountSaved = Math.min(rule.value, runningPrice);
      }
    } else if (discount.type === 'percentage') {
      amountSaved = Math.round(runningPrice * (discount.value / 100));
    } else {
      amountSaved = Math.min(discount.value, runningPrice);
    }

    runningPrice = Math.max(0, runningPrice - amountSaved);

    appliedDiscounts.push({
      discountId: discount._id,
      name: discount.name,
      type: appliedType,
      value: appliedValue,
      amountSaved,
    });

    if (runningPrice <= 0) break;
  }

  const discountAmount = originalPrice - runningPrice;

  return {
    finalPrice: Math.max(0, runningPrice),
    discountAmount,
    appliedDiscounts,
  };
}

/**
 * Format discount for display
 */
export function formatDiscountValue(type: 'percentage' | 'fixed', value: number): string {
  if (type === 'percentage') {
    return `${value}%`;
  }
  return `PKR ${value.toLocaleString()}`;
}

export function formatTierSlice(slice?: TierSliceDiscount | null): string {
  if (!slice || slice.value <= 0) return '—';
  return formatDiscountValue(slice.type, slice.value);
}

export function formatDayRulesSummary(d: { dayRules?: DiscountDayRule[] }): string {
  if (!hasDayRules(d)) return '—';
  return d.dayRules!
    .filter((r) => r.days.length > 0 && r.value > 0)
    .map((r) => {
      const dayPart = formatDaySet(r.days);
      return `${dayPart} ${formatDiscountValue(r.type, r.value)}`;
    })
    .join(' · ');
}

function formatDaySet(days: number[]): string {
  const sorted = [...days].sort((a, b) => a - b);
  if (
    sorted.length === WEEKDAY_DAYS.length &&
    WEEKDAY_DAYS.every((d) => sorted.includes(d))
  ) {
    return 'Weekdays';
  }
  if (
    sorted.length === WEEKEND_DAYS.length &&
    WEEKEND_DAYS.every((d) => sorted.includes(d))
  ) {
    return 'Weekend';
  }
  if (sorted.length === 7) return 'Every day';
  return sorted.map((d) => DAY_LABELS[d]).join(', ');
}

/** Table cell: day rules or uniform value */
export function formatDiscountValueSummary(d: {
  type: 'percentage' | 'fixed';
  value: number;
  dayRules?: DiscountDayRule[];
  tierDiscountMode?: TierDiscountMode;
  peakDiscount?: TierSliceDiscount;
  offPeakDiscount?: TierSliceDiscount;
}): string {
  if (hasDayRules(d)) return formatDayRulesSummary(d);
  if (usesTierSplitDiscount(d as DiscountInput)) return formatTierDiscountSummary(d);
  return formatDiscountValue(d.type, d.value);
}

/** Table cell: split peak/off or legacy tier label */
export function formatTierDiscountSummary(d: {
  tierDiscountMode?: TierDiscountMode;
  peakDiscount?: TierSliceDiscount;
  offPeakDiscount?: TierSliceDiscount;
  pricingTier?: DiscountPricingTier;
}): string {
  const split =
    d.tierDiscountMode === 'split' ||
    (d.peakDiscount != null && d.peakDiscount.value > 0) ||
    (d.offPeakDiscount != null && d.offPeakDiscount.value > 0);
  if (split) {
    const parts: string[] = [];
    if (d.peakDiscount && d.peakDiscount.value > 0) {
      parts.push(`Peak ${formatTierSlice(d.peakDiscount)}`);
    }
    if (d.offPeakDiscount && d.offPeakDiscount.value > 0) {
      parts.push(`Off-peak ${formatTierSlice(d.offPeakDiscount)}`);
    }
    return parts.length > 0 ? parts.join(' · ') : '—';
  }
  return formatPricingTierLabel(d.pricingTier);
}

/**
 * Format time restriction for display
 */
export function formatTimeRestriction(
  allDay: boolean,
  startHour: number,
  endHour: number,
): string {
  if (allDay) {
    return 'All Day';
  }

  const formatHour = (hour: number) => {
    if (hour === 0) return '12 AM';
    if (hour === 12) return '12 PM';
    if (hour < 12) return `${hour} AM`;
    return `${hour - 12} PM`;
  };

  return `${formatHour(startHour)} - ${formatHour(endHour)}`;
}

/**
 * Format min/max booking duration for display
 */
export function formatBookingDurationRange(
  minBookingHours?: number,
  maxBookingHours?: number,
): string {
  if (minBookingHours == null && maxBookingHours == null) {
    return 'Any duration';
  }
  if (minBookingHours != null && maxBookingHours != null) {
    return `${minBookingHours}–${maxBookingHours}h`;
  }
  if (minBookingHours != null) {
    return `${minBookingHours}h+`;
  }
  return `Up to ${maxBookingHours}h`;
}

export function formatPricingTierLabel(tier?: DiscountPricingTier): string {
  const t = tier ?? 'any';
  if (t === 'peak') return 'Peak';
  if (t === 'off_peak') return 'Off-peak';
  return 'Any tier';
}

/** Rules-based discounts (duration, tier, or clock window) vs simple flat promos */
export function isTimeBasedDiscount(d: {
  discountCategory?: DiscountCategory;
  minBookingHours?: number;
  maxBookingHours?: number;
  pricingTier?: DiscountPricingTier;
  allDay?: boolean;
}): boolean {
  if (d.discountCategory === 'flat') return false;
  if (d.discountCategory === 'time_based') return true;
  if (d.minBookingHours != null || d.maxBookingHours != null) return true;
  if ((d.pricingTier ?? 'any') !== 'any') return true;
  if (d.allDay === false) return true;
  return false;
}

export function inferDiscountCategory(d: Discount): DiscountCategory {
  if (d.discountCategory) return d.discountCategory;
  return isTimeBasedDiscount({
    discountCategory: undefined,
    minBookingHours: d.minBookingHours,
    maxBookingHours: d.maxBookingHours,
    pricingTier: d.pricingTier,
    allDay: d.allDay,
  })
    ? 'time_based'
    : 'flat';
}

export function inferTierDiscountMode(d: Discount): TierDiscountMode {
  if (d.tierDiscountMode) return d.tierDiscountMode;
  const hasSplitSlices =
    (d.peakDiscount != null && d.peakDiscount.value > 0) ||
    (d.offPeakDiscount != null && d.offPeakDiscount.value > 0);
  return hasSplitSlices ? 'split' : 'uniform';
}

/**
 * Format court types for display
 */
export function formatCourtTypes(courtTypes: CourtType[]): string {
  if (courtTypes.length === 0) {
    return 'All Courts';
  }
  return courtTypes.join(', ');
}

/**
 * Check if a discount is currently active (within valid date range and enabled)
 */
export function isDiscountCurrentlyActive(discount: DiscountInput): boolean {
  if (!discount.isActive) return false;

  const nowKey = toDateKeyInTimezone(new Date(), BUSINESS_TIMEZONE);
  const validFromKey = toDateKeyInTimezone(
    new Date(discount.validFrom),
    BUSINESS_TIMEZONE,
  );
  const validUntilKey = toDateKeyInTimezone(
    new Date(discount.validUntil),
    BUSINESS_TIMEZONE,
  );
  return validFromKey <= nowKey && nowKey <= validUntilKey;
}
