'use server';

import connectDB from '@/lib/mongodb';
import Discount from '@/models/Discount';
import type {
  DiscountPricingTier,
  DiscountCategory,
  TierDiscountMode,
} from '@/models/Discount';
import { CourtType } from '@/models/Court';
import { safeRevalidatePath } from '@/lib/safe-revalidate';
import { BUSINESS_TIMEZONE, toDateKeyInTimezone } from '@/lib/date-time';

const PRICING_TIERS: DiscountPricingTier[] = ['any', 'peak', 'off_peak'];

function validateBookingHourFields(
  min?: number | null,
  max?: number | null,
): string | null {
  if (min != null) {
    if (min <= 0 || min % 0.5 !== 0) {
      return 'Minimum booking hours must be a positive multiple of 0.5';
    }
  }
  if (max != null) {
    if (max <= 0 || max % 0.5 !== 0) {
      return 'Maximum booking hours must be a positive multiple of 0.5';
    }
  }
  if (min != null && max != null && min > max) {
    return 'Minimum booking hours cannot exceed maximum';
  }
  return null;
}

function validateUniformTypeValue(type: 'percentage' | 'fixed', value: number) {
  if (type === 'percentage' && (value <= 0 || value > 100)) {
    throw new Error('Percentage must be between 1 and 100');
  }
  if (type === 'fixed' && value <= 0) {
    throw new Error('Fixed discount amount must be greater than 0');
  }
}

function validateOptionalTierSlice(
  slice: { type: 'percentage' | 'fixed'; value: number } | undefined,
  label: string,
) {
  if (!slice || slice.value <= 0) return;
  if (slice.type === 'percentage' && slice.value > 100) {
    throw new Error(`${label} percentage must be at most 100`);
  }
  if (slice.type === 'fixed' && slice.value <= 0) {
    throw new Error(`${label} fixed amount must be greater than 0`);
  }
}

export interface DayRuleInput {
  days: number[];
  type: 'percentage' | 'fixed';
  value: number;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function validateDayRules(rules: DayRuleInput[]) {
  if (rules.length === 0) {
    throw new Error('Add at least one day rule');
  }
  const seen = new Set<number>();
  for (const rule of rules) {
    if (!Array.isArray(rule.days) || rule.days.length === 0) {
      throw new Error('Each day rule must include at least one day');
    }
    validateUniformTypeValue(rule.type, rule.value);
    for (const d of rule.days) {
      if (!Number.isInteger(d) || d < 0 || d > 6) {
        throw new Error('Invalid day of week');
      }
      if (seen.has(d)) {
        throw new Error(`${DAY_LABELS[d]} appears in more than one day rule`);
      }
      seen.add(d);
    }
  }
}

function applyDayRulesToDoc(
  doc: Record<string, unknown>,
  dayRules: DayRuleInput[] | undefined | null,
) {
  if (dayRules && dayRules.length > 0) {
    validateDayRules(dayRules);
    doc.dayRules = dayRules;
    doc.type = dayRules[0].type;
    doc.value = dayRules[0].value;
  }
}

function dateBoundaryUTC(input: string, boundary: "start" | "end"): Date {
  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Invalid date value");
  }

  const y = parsed.getUTCFullYear();
  const m = parsed.getUTCMonth();
  const d = parsed.getUTCDate();
  if (boundary === "start") {
    return new Date(Date.UTC(y, m, d, 0, 0, 0, 0));
  }
  return new Date(Date.UTC(y, m, d, 23, 59, 59, 999));
}

export async function getDiscounts() {
  try {
    await connectDB();

    const discounts = await Discount.find().sort({ createdAt: -1 }).lean();

    return {
      success: true,
      discounts: JSON.parse(JSON.stringify(discounts)).map(serializeDiscount),
    };
  } catch (error: any) {
    console.error('Get discounts error:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch discounts',
      discounts: [],
    };
  }
}

export async function getDiscountById(discountId: string) {
  try {
    await connectDB();

    const discount = await Discount.findById(discountId).lean();
    if (!discount) {
      return { success: false as const, error: 'Discount not found' };
    }

    return {
      success: true as const,
      discount: serializeDiscount(JSON.parse(JSON.stringify(discount))),
    };
  } catch (error: any) {
    console.error('Get discount error:', error);
    return {
      success: false as const,
      error: error.message || 'Failed to fetch discount',
    };
  }
}

function serializeDiscount(raw: Record<string, unknown>) {
  const dayRules = Array.isArray(raw.dayRules)
    ? raw.dayRules
        .filter(
          (r): r is Record<string, unknown> =>
            !!r && typeof r === 'object' && Array.isArray((r as { days?: unknown }).days),
        )
        .map((r) => ({
          days: (r.days as unknown[])
            .map((d) => Number(d))
            .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6),
          type: r.type === 'fixed' ? 'fixed' : 'percentage',
          value: Number(r.value) || 0,
        }))
        .filter((r) => r.days.length > 0 && r.value > 0)
    : undefined;

  return {
    ...raw,
    _id: String(raw._id),
    ...(dayRules && dayRules.length > 0 ? { dayRules } : {}),
  };
}

export async function getActiveDiscounts() {
  try {
    await connectDB();

    // Date-only check to avoid timezone edge cases on boundary days.
    const todayKey = toDateKeyInTimezone(new Date(), BUSINESS_TIMEZONE);
    const discountsRaw = await Discount.find({ isActive: true }).sort({ createdAt: -1 });
    const discounts = discountsRaw.filter((d: any) => {
      const fromKey = toDateKeyInTimezone(new Date(d.validFrom), BUSINESS_TIMEZONE);
      const untilKey = toDateKeyInTimezone(new Date(d.validUntil), BUSINESS_TIMEZONE);
      return fromKey <= todayKey && todayKey <= untilKey;
    });

    return {
      success: true,
      discounts: JSON.parse(JSON.stringify(discounts)),
    };
  } catch (error: any) {
    console.error('Get active discounts error:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch active discounts',
      discounts: [],
    };
  }
}

export interface TierSliceInput {
  type: 'percentage' | 'fixed';
  value: number;
}

export interface CreateDiscountInput {
  name: string;
  discountCategory: DiscountCategory;
  tierDiscountMode?: TierDiscountMode;
  type?: 'percentage' | 'fixed';
  value?: number;
  peakDiscount?: TierSliceInput;
  offPeakDiscount?: TierSliceInput;
  courtTypes: CourtType[];
  minBookingHours?: number;
  maxBookingHours?: number;
  pricingTier?: DiscountPricingTier;
  allDay: boolean;
  startHour?: number;
  endHour?: number;
  validFrom: string;
  validUntil: string;
  isActive?: boolean;
  dayRules?: DayRuleInput[] | null;
}

export async function createDiscount(input: CreateDiscountInput) {
  try {
    await connectDB();

    const hourErr = validateBookingHourFields(input.minBookingHours, input.maxBookingHours);
    if (hourErr) throw new Error(hourErr);

    if (!input.allDay) {
      if (input.startHour === undefined || input.endHour === undefined) {
        throw new Error('Start and end hours are required for time-restricted discounts');
      }
      if (input.startHour >= input.endHour) {
        throw new Error('End hour must be greater than start hour');
      }
    }

    const common = {
      name: input.name,
      courtTypes: input.courtTypes,
      validFrom: dateBoundaryUTC(input.validFrom, 'start'),
      validUntil: dateBoundaryUTC(input.validUntil, 'end'),
      isActive: input.isActive ?? true,
    };

    const cat = input.discountCategory;
    const mode: TierDiscountMode = input.tierDiscountMode ?? 'uniform';

    if (input.dayRules?.length && mode === 'split') {
      throw new Error('Day-based rates cannot be combined with peak/off-peak split');
    }

    let doc: Record<string, unknown>;

    if (cat === 'flat') {
      if (!input.dayRules?.length && (!input.type || input.value == null)) {
        throw new Error('Discount type and value are required');
      }
      if (!input.dayRules?.length) {
        validateUniformTypeValue(input.type!, input.value!);
      }
      doc = {
        ...common,
        discountCategory: 'flat',
        tierDiscountMode: 'uniform',
        type: input.type ?? input.dayRules![0].type,
        value: input.value ?? input.dayRules![0].value,
        pricingTier: 'any',
        allDay: true,
        startHour: 0,
        endHour: 23,
      };
    } else {
      doc = {
        ...common,
        discountCategory: 'time_based',
        allDay: input.allDay,
        startHour: input.allDay ? 0 : input.startHour,
        endHour: input.allDay ? 23 : input.endHour,
        ...(input.minBookingHours != null ? { minBookingHours: input.minBookingHours } : {}),
        ...(input.maxBookingHours != null ? { maxBookingHours: input.maxBookingHours } : {}),
      };

      if (mode === 'split') {
        const pk = input.peakDiscount;
        const ok = input.offPeakDiscount;
        const hasP = !!(pk && pk.value > 0);
        const hasO = !!(ok && ok.value > 0);
        if (!hasP && !hasO) {
          throw new Error('Add at least one peak or off-peak discount');
        }
        validateOptionalTierSlice(pk, 'Peak');
        validateOptionalTierSlice(ok, 'Off-peak');
        doc.tierDiscountMode = 'split';
        doc.pricingTier = 'any';
        doc.type = input.type ?? 'percentage';
        doc.value = input.value ?? 0.01;
        if (hasP) doc.peakDiscount = pk;
        if (hasO) doc.offPeakDiscount = ok;
      } else {
        if (!input.dayRules?.length && (!input.type || input.value == null)) {
          throw new Error('Discount type and value are required');
        }
        if (!input.dayRules?.length) {
          validateUniformTypeValue(input.type!, input.value!);
        }
        const tier = input.pricingTier ?? 'any';
        if (!PRICING_TIERS.includes(tier)) {
          throw new Error('Invalid pricing tier');
        }
        doc.tierDiscountMode = 'uniform';
        doc.type = input.type ?? input.dayRules![0].type;
        doc.value = input.value ?? input.dayRules![0].value;
        doc.pricingTier = tier;
      }
    }

    applyDayRulesToDoc(doc, input.dayRules);

    const discount = await Discount.create(doc);

    safeRevalidatePath('/admin/discounts');
    safeRevalidatePath('/');
    safeRevalidatePath('/booking');

    return {
      success: true,
      discount: JSON.parse(JSON.stringify(discount)),
    };
  } catch (error: any) {
    console.error('Create discount error:', error);
    return {
      success: false,
      error: error.message || 'Failed to create discount',
    };
  }
}

export interface UpdateDiscountInput {
  discountId: string;
  name?: string;
  discountCategory?: DiscountCategory;
  tierDiscountMode?: TierDiscountMode;
  type?: 'percentage' | 'fixed';
  value?: number;
  peakDiscount?: TierSliceInput | null;
  offPeakDiscount?: TierSliceInput | null;
  courtTypes?: CourtType[];
  minBookingHours?: number | null;
  maxBookingHours?: number | null;
  pricingTier?: DiscountPricingTier;
  allDay?: boolean;
  startHour?: number;
  endHour?: number;
  validFrom?: string;
  validUntil?: string;
  isActive?: boolean;
  dayRules?: DayRuleInput[] | null;
}

export async function updateDiscount(input: UpdateDiscountInput) {
  try {
    await connectDB();

    const { discountId, ...updateData } = input;

    const currentDiscount = await Discount.findById(discountId);
    if (!currentDiscount) {
      throw new Error('Discount not found');
    }

    const allDay = updateData.allDay ?? currentDiscount.allDay;

    if (!allDay) {
      const startHour = updateData.startHour ?? currentDiscount.startHour;
      const endHour = updateData.endHour ?? currentDiscount.endHour;
      if (startHour >= endHour) {
        throw new Error('End hour must be greater than start hour');
      }
    }

    function mergedBookingHour(
      incoming: number | null | undefined,
      current: number | undefined | null,
    ): number | undefined {
      if (incoming === null) return undefined;
      if (incoming !== undefined) return incoming;
      return current ?? undefined;
    }

    const mergedMin = mergedBookingHour(
      updateData.minBookingHours,
      currentDiscount.minBookingHours,
    );
    const mergedMax = mergedBookingHour(
      updateData.maxBookingHours,
      currentDiscount.maxBookingHours,
    );
    const hourErr = validateBookingHourFields(mergedMin, mergedMax);
    if (hourErr) throw new Error(hourErr);

    if (updateData.pricingTier != null && !PRICING_TIERS.includes(updateData.pricingTier)) {
      throw new Error('Invalid pricing tier');
    }

    const mergedCat = updateData.discountCategory ?? currentDiscount.discountCategory ?? 'flat';
    const mergedMode = updateData.tierDiscountMode ?? currentDiscount.tierDiscountMode ?? 'uniform';

    const mergedDayRules =
      updateData.dayRules === undefined
        ? (currentDiscount.dayRules as DayRuleInput[] | undefined)
        : updateData.dayRules ?? undefined;

    if (mergedDayRules?.length && mergedMode === 'split') {
      throw new Error('Day-based rates cannot be combined with peak/off-peak split');
    }

    const type = updateData.type ?? currentDiscount.type;
    const value = updateData.value ?? currentDiscount.value;

    if (mergedCat === 'flat') {
      if (updateData.type != null || updateData.value != null) {
        if (!mergedDayRules?.length) {
          validateUniformTypeValue(type, value);
        }
      }
    } else if (mergedMode === 'uniform') {
      if (updateData.type != null || updateData.value != null) {
        if (!mergedDayRules?.length) {
          validateUniformTypeValue(type, value);
        }
      }
    } else {
      validateOptionalTierSlice(updateData.peakDiscount ?? undefined, 'Peak');
      validateOptionalTierSlice(updateData.offPeakDiscount ?? undefined, 'Off-peak');
    }

    const $set: Record<string, unknown> = {};
    const $unset: Record<string, 1> = {};

    if (updateData.name !== undefined) $set.name = updateData.name;
    if (updateData.discountCategory !== undefined) $set.discountCategory = updateData.discountCategory;
    if (updateData.tierDiscountMode !== undefined) $set.tierDiscountMode = updateData.tierDiscountMode;
    if (updateData.type !== undefined) $set.type = updateData.type;
    if (updateData.value !== undefined) $set.value = updateData.value;
    if (updateData.courtTypes !== undefined) $set.courtTypes = updateData.courtTypes;
    if (updateData.allDay !== undefined) $set.allDay = updateData.allDay;
    if (updateData.startHour !== undefined) $set.startHour = updateData.startHour;
    if (updateData.endHour !== undefined) $set.endHour = updateData.endHour;
    if (updateData.isActive !== undefined) $set.isActive = updateData.isActive;
    if (updateData.pricingTier !== undefined) $set.pricingTier = updateData.pricingTier;

    if (updateData.peakDiscount !== undefined) {
      if (updateData.peakDiscount === null) {
        $unset.peakDiscount = 1;
      } else {
        $set.peakDiscount = updateData.peakDiscount;
      }
    }
    if (updateData.offPeakDiscount !== undefined) {
      if (updateData.offPeakDiscount === null) {
        $unset.offPeakDiscount = 1;
      } else {
        $set.offPeakDiscount = updateData.offPeakDiscount;
      }
    }

    if (updateData.validFrom) {
      $set.validFrom = dateBoundaryUTC(updateData.validFrom, 'start');
    }
    if (updateData.validUntil) {
      $set.validUntil = dateBoundaryUTC(updateData.validUntil, 'end');
    }

    if (updateData.minBookingHours === null) {
      $unset.minBookingHours = 1;
    } else if (updateData.minBookingHours !== undefined) {
      $set.minBookingHours = updateData.minBookingHours;
    }

    if (updateData.maxBookingHours === null) {
      $unset.maxBookingHours = 1;
    } else if (updateData.maxBookingHours !== undefined) {
      $set.maxBookingHours = updateData.maxBookingHours;
    }

    if (updateData.dayRules !== undefined) {
      if (updateData.dayRules === null || updateData.dayRules.length === 0) {
        $unset.dayRules = 1;
      } else {
        validateDayRules(updateData.dayRules);
        $set.dayRules = updateData.dayRules;
        $set.type = updateData.dayRules[0].type;
        $set.value = updateData.dayRules[0].value;
      }
    }

    $unset.courtIds = 1;

    if (updateData.discountCategory === 'flat') {
      $set.pricingTier = 'any';
      $set.allDay = true;
      $set.startHour = 0;
      $set.endHour = 23;
      $unset.minBookingHours = 1;
      $unset.maxBookingHours = 1;
      $unset.peakDiscount = 1;
      $unset.offPeakDiscount = 1;
      $set.tierDiscountMode = 'uniform';
    }

    if (updateData.tierDiscountMode === 'uniform') {
      $unset.peakDiscount = 1;
      $unset.offPeakDiscount = 1;
    }

    const updatePayload: Record<string, unknown> = {};
    if (Object.keys($set).length > 0) updatePayload.$set = $set;
    if (Object.keys($unset).length > 0) updatePayload.$unset = $unset;

    const discount = await Discount.findByIdAndUpdate(
      discountId,
      updatePayload,
      { new: true, runValidators: true },
    );

    safeRevalidatePath('/admin/discounts');
    safeRevalidatePath('/');
    safeRevalidatePath('/booking');

    return {
      success: true,
      discount: JSON.parse(JSON.stringify(discount)),
    };
  } catch (error: any) {
    console.error('Update discount error:', error);
    return {
      success: false,
      error: error.message || 'Failed to update discount',
    };
  }
}

export async function deleteDiscount(discountId: string) {
  try {
    await connectDB();

    const discount = await Discount.findByIdAndDelete(discountId);

    if (!discount) {
      throw new Error('Discount not found');
    }

    safeRevalidatePath('/admin/discounts');
    safeRevalidatePath('/');
    safeRevalidatePath('/booking');

    return {
      success: true,
    };
  } catch (error: any) {
    console.error('Delete discount error:', error);
    return {
      success: false,
      error: error.message || 'Failed to delete discount',
    };
  }
}

export async function toggleDiscountActive(discountId: string) {
  try {
    await connectDB();

    const discount = await Discount.findById(discountId);

    if (!discount) {
      throw new Error('Discount not found');
    }

    discount.isActive = !discount.isActive;
    await discount.save();

    safeRevalidatePath('/admin/discounts');
    safeRevalidatePath('/');
    safeRevalidatePath('/booking');

    return {
      success: true,
      discount: JSON.parse(JSON.stringify(discount)),
    };
  } catch (error: any) {
    console.error('Toggle discount error:', error);
    return {
      success: false,
      error: error.message || 'Failed to toggle discount status',
    };
  }
}
