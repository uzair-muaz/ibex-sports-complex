export type CourtType = "PADEL" | "CRICKET" | "PICKLEBALL" | "FUTSAL";

export type PricingLabel = "off_peak" | "peak";

export interface CourtPricingPeriod {
  _id?: string;
  label: PricingLabel;
  /**
   * Decimal hour in 0.5 increments (e.g. 12, 12.5, 13)
   * Represents the start of the period in 24h format.
   */
  startHour: number;
  /**
   * Decimal hour in 0.5 increments (e.g. 16, 16.5, 2)
   * Represents the end of the period in 24h format.
   * If endHour <= startHour we treat it as wrapping past midnight.
   */
  endHour: number;
  /** Price per hour during this period */
  pricePerHour: number;
  /** If true, applies all day regardless of hours */
  allDay?: boolean;
}

export interface Court {
  _id: string;
  name: string;
  type: CourtType;
  image: string;
  description: string;
  pricePerHour: number;
  isActive: boolean;
  /** Enable time-based peak/off-peak pricing */
  timeBasedPricingEnabled?: boolean;
  /** Optional list of peak/off-peak pricing periods */
  pricingPeriods?: CourtPricingPeriod[];
}

export interface AppliedDiscount {
  discountId: string;
  name: string;
  type: "percentage" | "fixed";
  value: number;
  amountSaved: number;
}

export interface Booking {
  _id: string;
  courtId: string;
  date: string; // YYYY-MM-DD
  startTime: number; // Hour (0-23)
  duration: number; // Hours
   /** Incremental booking serial (1, 2, 3, ...) */
  serialNumber?: number;
  userName: string;
  userEmail: string;
  userPhone?: string;
  status: "pending_payment" | "confirmed" | "cancelled" | "completed";
  originalPrice: number;
  discounts: AppliedDiscount[];
  discountAmount: number;
  totalPrice: number;
  amountPaid: number;
  amountReceivedOnline?: number;
  amountReceivedCash?: number;
  createdAt: string;
  updatedAt: string;
}

/** Peak/off-peak scope for a discount; `any` = no tier filter (legacy). */
export type DiscountPricingTier = "any" | "peak" | "off_peak";

export type DiscountCategory = "flat" | "time_based";

/** Uniform = single rate for whole booking; split = separate peak / off-peak amounts */
export type TierDiscountMode = "uniform" | "split";

export interface TierSliceDiscount {
  type: "percentage" | "fixed";
  value: number;
}

/** Per-day-of-week discount rate. days: 0=Sun … 6=Sat */
export type DayRuleRateMode = "uniform" | "split";

export interface DiscountDayRule {
  days: number[];
  /** uniform = one rate all day; split = peak/off-peak amounts on matching days */
  rateMode?: DayRuleRateMode;
  type: "percentage" | "fixed";
  value: number;
  peakDiscount?: TierSliceDiscount;
  offPeakDiscount?: TierSliceDiscount;
}

export interface Discount {
  _id: string;
  name: string;
  type: "percentage" | "fixed";
  value: number;
  courtTypes: CourtType[];
  discountCategory?: DiscountCategory;
  /** When `time_based` and `split`, use peakDiscount / offPeakDiscount instead of uniform type/value */
  tierDiscountMode?: TierDiscountMode;
  peakDiscount?: TierSliceDiscount;
  offPeakDiscount?: TierSliceDiscount;
  /** When set, discount applies only on matching days with that rule's rate */
  dayRules?: DiscountDayRule[];
  /** Inclusive min booking duration (hours, 0.5 steps). Omit with max for no duration filter. */
  minBookingHours?: number;
  /** Inclusive max booking duration (hours, 0.5 steps). */
  maxBookingHours?: number;
  /** When not `any`, discount applies only if booking start matches this pricing tier on the court */
  pricingTier?: DiscountPricingTier;
  allDay: boolean;
  startHour: number;
  endHour: number;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TimeSlot {
  hour: number;
  available: boolean;
  courtId?: string;
}

export const OPERATING_HOURS = {
  start: 6, // 6 AM
  end: 23, // 11 PM
};

// Complex opening date - no bookings allowed before this date
export const COMPLEX_OPENING_DATE = new Date(2026, 1, 1); // February 1st, 2026 (month is 0-indexed)

/** Lifestyle section gallery — curated images, ordered for collage rhythm */
export const GALLERY_IMAGES = [
  { url: "/lifestyle/lifestyle-11.webp", title: "Paddle Courts at Dusk" },
  { url: "/lifestyle/lifestyle-8.webp", title: "Sunset on the Pitch" },
  { url: "/lifestyle/lifestyle-12.webp", title: "The Social Scene" },
  { url: "/lifestyle/lifestyle-3.webp", title: "The Complex at Night" },
  { url: "/lifestyle/lifestyle-10.webp", title: "Courtside" },
  { url: "/lifestyle/lifestyle-7.webp", title: "Through the Net" },
];
