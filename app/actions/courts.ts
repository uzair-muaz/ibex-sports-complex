'use server';

import connectDB from '@/lib/mongodb';
import Court from '@/models/Court';
import { revalidatePath } from 'next/cache';
import type { CourtPricingPeriod } from '@/types';

const BUSINESS_START_HOUR = 12; // 12 PM
const BUSINESS_END_HOUR = 28; // 4 AM next day (24 + 4)

function normalizeHour(hour: number): number {
  // Map 0-4 (AM) to 24-28 for continuous timeline
  if (hour < BUSINESS_START_HOUR) {
    return hour + 24;
  }
  return hour;
}

function validateTimeBasedPricing(periods: CourtPricingPeriod[]): string | null {
  if (!periods.length) {
    return 'Please add at least one peak/off-peak period when dynamic pricing is enabled.';
  }

  const covered = new Set<number>();

  for (const period of periods) {
    const ns = normalizeHour(period.startHour);
    const ne = normalizeHour(period.endHour);

    if (ns < BUSINESS_START_HOUR || ne > BUSINESS_END_HOUR) {
      return 'Peak/off-peak hours must be within 12:00 PM to 4:00 AM.';
    }

    if (ne <= ns) {
      return 'Each peak/off-peak period must have an end time after its start time.';
    }

    for (let t = ns; t < ne; t += 0.5) {
      covered.add(Number(t.toFixed(2)));
    }
  }

  // Ensure full coverage from 12 PM (12) to 4 AM next day (28) in 30-minute steps
  for (let t = BUSINESS_START_HOUR; t < BUSINESS_END_HOUR; t += 0.5) {
    const key = Number(t.toFixed(2));
    if (!covered.has(key)) {
      return 'Peak/off-peak periods must fully cover 12:00 PM to 4:00 AM without gaps.';
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

    revalidatePath('/admin');
    revalidatePath('/');

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

    revalidatePath('/admin');
    revalidatePath('/');

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

    revalidatePath('/admin');
    revalidatePath('/');

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

