'use server';

import connectDB from '@/lib/mongodb';
import Discount, { IDiscount } from '@/models/Discount';
import { CourtType } from '@/models/Court';
import { revalidatePath } from 'next/cache';
import { BUSINESS_TIMEZONE, toDateKeyInTimezone } from '@/lib/date-time';

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

    const discounts = await Discount.find().sort({ createdAt: -1 });

    return {
      success: true,
      discounts: JSON.parse(JSON.stringify(discounts)),
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

export interface CreateDiscountInput {
  name: string;
  type: 'percentage' | 'fixed';
  value: number;
  courtTypes: CourtType[];
  allDay: boolean;
  startHour?: number;
  endHour?: number;
  validFrom: string; // ISO date string
  validUntil: string; // ISO date string
  isActive?: boolean;
}

export async function createDiscount(input: CreateDiscountInput) {
  try {
    await connectDB();

    // Validate percentage value
    if (input.type === 'percentage' && (input.value <= 0 || input.value > 100)) {
      throw new Error('Percentage must be between 0 and 100');
    }

    // Validate fixed value
    if (input.type === 'fixed' && input.value <= 0) {
      throw new Error('Fixed discount amount must be greater than 0');
    }

    // Validate hour range if not allDay
    if (!input.allDay) {
      if (input.startHour === undefined || input.endHour === undefined) {
        throw new Error('Start and end hours are required for time-restricted discounts');
      }
      if (input.startHour >= input.endHour) {
        throw new Error('End hour must be greater than start hour');
      }
    }

    const discount = await Discount.create({
      name: input.name,
      type: input.type,
      value: input.value,
      courtTypes: input.courtTypes,
      allDay: input.allDay,
      startHour: input.allDay ? 0 : input.startHour,
      endHour: input.allDay ? 23 : input.endHour,
      validFrom: dateBoundaryUTC(input.validFrom, "start"),
      validUntil: dateBoundaryUTC(input.validUntil, "end"),
      isActive: input.isActive ?? true,
    });

    revalidatePath('/admin/discounts');
    revalidatePath('/');
    revalidatePath('/booking');

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
  type?: 'percentage' | 'fixed';
  value?: number;
  courtTypes?: CourtType[];
  allDay?: boolean;
  startHour?: number;
  endHour?: number;
  validFrom?: string;
  validUntil?: string;
  isActive?: boolean;
}

export async function updateDiscount(input: UpdateDiscountInput) {
  try {
    await connectDB();

    const { discountId, ...updateData } = input;

    // Fetch current discount to merge data for validation
    const currentDiscount = await Discount.findById(discountId);
    if (!currentDiscount) {
      throw new Error('Discount not found');
    }

    const type = updateData.type ?? currentDiscount.type;
    const value = updateData.value ?? currentDiscount.value;
    const allDay = updateData.allDay ?? currentDiscount.allDay;

    // Validate percentage value
    if (type === 'percentage' && (value <= 0 || value > 100)) {
      throw new Error('Percentage must be between 0 and 100');
    }

    // Validate fixed value
    if (type === 'fixed' && value <= 0) {
      throw new Error('Fixed discount amount must be greater than 0');
    }

    // Validate hour range if not allDay
    if (!allDay) {
      const startHour = updateData.startHour ?? currentDiscount.startHour;
      const endHour = updateData.endHour ?? currentDiscount.endHour;
      if (startHour >= endHour) {
        throw new Error('End hour must be greater than start hour');
      }
    }

    // Convert date strings to Date objects if provided
    const finalUpdateData: any = { ...updateData };
    if (updateData.validFrom) {
      finalUpdateData.validFrom = dateBoundaryUTC(updateData.validFrom, "start");
    }
    if (updateData.validUntil) {
      finalUpdateData.validUntil = dateBoundaryUTC(updateData.validUntil, "end");
    }

    const discount = await Discount.findByIdAndUpdate(
      discountId,
      finalUpdateData,
      { new: true, runValidators: true }
    );

    revalidatePath('/admin/discounts');
    revalidatePath('/');
    revalidatePath('/booking');

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

    revalidatePath('/admin/discounts');
    revalidatePath('/');
    revalidatePath('/booking');

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

    revalidatePath('/admin/discounts');
    revalidatePath('/');
    revalidatePath('/booking');

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
