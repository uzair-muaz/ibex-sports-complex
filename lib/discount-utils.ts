import { CourtType } from '@/models/Court';
import { AppliedDiscount } from '@/types';

export interface DiscountInput {
  _id: string;
  name: string;
  type: 'percentage' | 'fixed';
  value: number;
  courtTypes: CourtType[];
  allDay: boolean;
  startHour: number;
  endHour: number;
  validFrom: string | Date;
  validUntil: string | Date;
  isActive: boolean;
}

/**
 * Filters discounts that are applicable for the given booking parameters
 */
export function getApplicableDiscounts(
  discounts: DiscountInput[],
  courtType: CourtType,
  startTime: number,
  date: string // YYYY-MM-DD format
): DiscountInput[] {
  const bookingDate = new Date(date);
  
  return discounts.filter((discount) => {
    // Check if discount is active
    if (!discount.isActive) return false;

    // Check date validity
    const validFrom = new Date(discount.validFrom);
    const validUntil = new Date(discount.validUntil);
    
    // Set times to start/end of day for comparison
    validFrom.setHours(0, 0, 0, 0);
    validUntil.setHours(23, 59, 59, 999);
    bookingDate.setHours(12, 0, 0, 0); // Noon to avoid timezone issues

    if (bookingDate < validFrom || bookingDate > validUntil) {
      return false;
    }

    // Check court type (empty or missing array means all courts)
    const courtTypes = Array.isArray(discount.courtTypes) ? discount.courtTypes : [];
    if (courtTypes.length > 0 && !courtTypes.includes(courtType)) {
      return false;
    }

    // Check time restriction
    if (!discount.allDay) {
      // Booking start time must be within the discount hours
      if (startTime < discount.startHour || startTime >= discount.endHour) {
        return false;
      }
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
  applicableDiscounts: DiscountInput[]
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

  // Sort: percentage discounts first, then fixed
  const sortedDiscounts = [...applicableDiscounts].sort((a, b) => {
    if (a.type === 'percentage' && b.type === 'fixed') return -1;
    if (a.type === 'fixed' && b.type === 'percentage') return 1;
    return 0;
  });

  let runningPrice = originalPrice;
  const appliedDiscounts: AppliedDiscount[] = [];

  for (const discount of sortedDiscounts) {
    let amountSaved: number;

    if (discount.type === 'percentage') {
      amountSaved = Math.round(runningPrice * (discount.value / 100));
    } else {
      // Fixed discount
      amountSaved = Math.min(discount.value, runningPrice); // Can't discount more than remaining price
    }

    runningPrice = Math.max(0, runningPrice - amountSaved);

    appliedDiscounts.push({
      discountId: discount._id,
      name: discount.name,
      type: discount.type,
      value: discount.value,
      amountSaved,
    });

    // Stop if price is already 0
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
 * Returns something like "30%" or "PKR 1,000"
 */
export function formatDiscountValue(type: 'percentage' | 'fixed', value: number): string {
  if (type === 'percentage') {
    return `${value}%`;
  }
  return `PKR ${value.toLocaleString()}`;
}

/**
 * Format time restriction for display
 */
export function formatTimeRestriction(
  allDay: boolean,
  startHour: number,
  endHour: number
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

  const now = new Date();
  const validFrom = new Date(discount.validFrom);
  const validUntil = new Date(discount.validUntil);

  validFrom.setHours(0, 0, 0, 0);
  validUntil.setHours(23, 59, 59, 999);

  return now >= validFrom && now <= validUntil;
}
