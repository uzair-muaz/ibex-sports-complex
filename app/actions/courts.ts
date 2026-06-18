'use server';

import connectDB from '@/lib/mongodb';
import Court from '@/models/Court';
import { safeRevalidatePath } from '@/lib/safe-revalidate';
import type { CourtPricingPeriod } from '@/types';

const FULL_DAY_HOURS = 24;

function addPeriodSlots(
  covered: Set<number>,
  startHour: number,
  endHour: number,
): void {
  if (startHour < endHour) {
    for (let t = startHour; t < endHour; t += 0.5) {
      covered.add(Number(t.toFixed(2)));
    }
    return;
  }

  // Wraps past midnight, e.g. 10:00 PM – 2:00 AM
  for (let t = startHour; t < FULL_DAY_HOURS; t += 0.5) {
    covered.add(Number(t.toFixed(2)));
  }
  for (let t = 0; t < endHour; t += 0.5) {
    covered.add(Number(t.toFixed(2)));
  }
}

function validateTimeBasedPricing(periods: CourtPricingPeriod[]): string | null {
  if (!periods.length) {
    return 'Please add at least one peak/off-peak period when dynamic pricing is enabled.';
  }

  const covered = new Set<number>();

  for (const period of periods) {
    const start = period.startHour;
    const end = period.endHour;

    if (
      typeof start !== 'number' ||
      typeof end !== 'number' ||
      start < 0 ||
      start > FULL_DAY_HOURS ||
      end < 0 ||
      end > FULL_DAY_HOURS
    ) {
      return 'Peak/off-peak hours must be within a full 24-hour day (12:00 AM to 12:00 AM).';
    }

    if (start === end) {
      return 'Each peak/off-peak period must have an end time after its start time.';
    }

    addPeriodSlots(covered, start, end);
  }

  for (let t = 0; t < FULL_DAY_HOURS; t += 0.5) {
    const key = Number(t.toFixed(2));
    if (!covered.has(key)) {
      return 'Peak/off-peak periods must fully cover the full 24 hours without gaps.';
    }
  }

  return null;
}

export async function getCourts(type?: 'PADEL' | 'CRICKET' | 'PICKLEBALL' | 'FUTSAL') {
  try {
    await connectDB();

    const query: any = { isActive: true };
    if (type) {
      query.type = type;
    }

    const courts = await Court.find(query).sort({ createdAt: 1 });

    return {
      success: true,
      courts: JSON.parse(JSON.stringify(courts)),
    };
  } catch (error: any) {
    console.error('Get courts error:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch courts',
      courts: [],
    };
  }
}

export async function getAllCourts() {
  try {
    await connectDB();

    const courts = await Court.find().sort({ createdAt: 1 });

    return {
      success: true,
      courts: JSON.parse(JSON.stringify(courts)),
    };
  } catch (error: any) {
    console.error('Get all courts error:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch courts',
      courts: [],
    };
  }
}

export interface CreateCourtInput {
  name: string;
  type: 'PADEL' | 'CRICKET' | 'PICKLEBALL' | 'FUTSAL';
  image?: string; // Images are hardcoded, optional
  description: string;
  pricePerHour: number;
  timeBasedPricingEnabled?: boolean;
  pricingPeriods?: CourtPricingPeriod[];
}

export async function createCourt(input: CreateCourtInput) {
  try {
    await connectDB();

    if (input.timeBasedPricingEnabled) {
      const error = validateTimeBasedPricing(input.pricingPeriods || []);
      if (error) {
        return {
          success: false,
          error,
        };
      }
    }

    const court = await Court.create({
      name: input.name,
      type: input.type,
      image: input.image || '', // Images are hardcoded, not stored
      description: input.description,
      pricePerHour: input.pricePerHour,
      isActive: true,
      timeBasedPricingEnabled: input.timeBasedPricingEnabled ?? false,
      pricingPeriods: input.pricingPeriods ?? [],
    });

    safeRevalidatePath('/admin');
    safeRevalidatePath('/');

    return {
      success: true,
      court: JSON.parse(JSON.stringify(court)),
    };
  } catch (error: any) {
    console.error('Create court error:', error);
    return {
      success: false,
      error: error.message || 'Failed to create court',
    };
  }
}

export interface UpdateCourtInput {
  courtId: string;
  name?: string;
  type?: 'PADEL' | 'CRICKET' | 'PICKLEBALL' | 'FUTSAL';
  image?: string;
  description?: string;
  pricePerHour?: number;
  isActive?: boolean;
  timeBasedPricingEnabled?: boolean;
  pricingPeriods?: CourtPricingPeriod[];
}

export async function updateCourt(input: UpdateCourtInput) {
  try {
    await connectDB();

    const { courtId, ...updateData } = input;

    if (updateData.timeBasedPricingEnabled) {
      const error = validateTimeBasedPricing(updateData.pricingPeriods || []);
      if (error) {
        return {
          success: false,
          error,
        };
      }
    }

    const court = await Court.findByIdAndUpdate(
      courtId,
      updateData,
      { new: true, runValidators: true }
    );

    if (!court) {
      throw new Error('Court not found');
    }

    safeRevalidatePath('/admin');
    safeRevalidatePath('/');

    return {
      success: true,
      court: JSON.parse(JSON.stringify(court)),
    };
  } catch (error: any) {
    console.error('Update court error:', error);
    return {
      success: false,
      error: error.message || 'Failed to update court',
    };
  }
}

export async function deleteCourt(courtId: string) {
  try {
    await connectDB();

    const court = await Court.findByIdAndDelete(courtId);

    if (!court) {
      throw new Error('Court not found');
    }

    safeRevalidatePath('/admin');
    safeRevalidatePath('/');

    return {
      success: true,
    };
  } catch (error: any) {
    console.error('Delete court error:', error);
    return {
      success: false,
      error: error.message || 'Failed to delete court',
    };
  }
}

