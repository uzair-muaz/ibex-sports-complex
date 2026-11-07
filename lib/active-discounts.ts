import connectDB from "@/lib/mongodb";
import Discount from "@/models/Discount";
import { BUSINESS_TIMEZONE, toDateKeyInTimezone } from "@/lib/date-time";
import type { DiscountInput } from "@/lib/discount-utils";

/**
 * Discount row → the shape lib/discount-utils.ts expects.
 * Same mapping as app/actions/bookings.ts (a "use server" file can't share it).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- lean() rows are untyped
export function toDiscountInput(d: any): DiscountInput {
  return {
    _id: d._id.toString(),
    name: d.name,
    type: d.type,
    value: d.value,
    courtTypes: Array.isArray(d.courtTypes) ? d.courtTypes : [],
    discountCategory: d.discountCategory,
    tierDiscountMode: d.tierDiscountMode,
    peakDiscount: d.peakDiscount,
    offPeakDiscount: d.offPeakDiscount,
    dayRules: Array.isArray(d.dayRules) ? d.dayRules : undefined,
    minBookingHours: d.minBookingHours,
    maxBookingHours: d.maxBookingHours,
    pricingTier: d.pricingTier ?? "any",
    allDay: d.allDay,
    startHour: d.startHour,
    endHour: d.endHour,
    validFrom: d.validFrom,
    validUntil: d.validUntil,
    isActive: d.isActive,
  };
}

/** Active discounts valid on this venue date (same rule the website uses). */
export async function getActiveDiscountInputs(dateKey: string): Promise<DiscountInput[]> {
  await connectDB();
  const rows = await Discount.find({ isActive: true }).lean();
  return rows
    .filter((d) => {
      const from = toDateKeyInTimezone(new Date(d.validFrom), BUSINESS_TIMEZONE);
      const until = toDateKeyInTimezone(new Date(d.validUntil), BUSINESS_TIMEZONE);
      return from <= dateKey && dateKey <= until;
    })
    .map(toDiscountInput);
}
