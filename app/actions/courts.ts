'use server';

import { audit, snapshot } from '@/lib/audit';
import connectDB from '@/lib/mongodb';
import Court from '@/models/Court';
import type { CourtFeature } from '@/models/Court';
import { sanitizeCourtAppFields } from '@/lib/court-app-fields';
import { safeRevalidatePath } from '@/lib/safe-revalidate';
import type { CourtPricingPeriod } from '@/types';
import { requireStaffActor, type StaffActorOpts } from '@/lib/action-auth';

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

/** Weekend prices: empty means "same as weekday". Cleans them in place; returns an error or null. */
function cleanWeekendPrices(input: { weekendPricePerHour?: number | null; pricingPeriods?: CourtPricingPeriod[] }): string | null {
  const clean = (v: unknown): number | null | undefined | "bad" => {
    if (v === undefined) return undefined;
    if (v === null || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 && n <= 1_000_000 ? n : "bad";
  };
  const base = clean(input.weekendPricePerHour);
  if (base === "bad") return "Weekend price must be a number of 0 or more.";
  if (base !== undefined) input.weekendPricePerHour = base;
  for (const p of input.pricingPeriods ?? []) {
    const w = clean(p.weekendPricePerHour);
    if (w === "bad") return "Weekend price for a peak/off-peak period must be a number of 0 or more.";
    p.weekendPricePerHour = w ?? null;
  }
  return null;
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

export async function getAllCourts(opts?: StaffActorOpts) {
  try {
    const gate = await requireStaffActor(opts, { superAdmin: true });
    if (!gate.ok) return { success: false, error: gate.error, courts: [] };
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
  /** Saturday and Sunday price. Empty = same as pricePerHour. */
  weekendPricePerHour?: number | null;
  timeBasedPricingEnabled?: boolean;
  pricingPeriods?: CourtPricingPeriod[];
  surfaceLabel?: string;
  isIndoor?: boolean;
  hasRacketRental?: boolean;
  /** Feature objects, or just keys (labels are filled in). */
  features?: Array<CourtFeature | string>;
  highlight?: CourtFeature | string | null;
}

export async function createCourt(input: CreateCourtInput, opts?: StaffActorOpts) {
  try {
    const gate = await requireStaffActor(opts, { superAdmin: true });
    if (!gate.ok) return { success: false, error: gate.error };
    await connectDB();

    const weekendError = cleanWeekendPrices(input);
    if (weekendError) return { success: false, error: weekendError };

    if (input.timeBasedPricingEnabled) {
      const error = validateTimeBasedPricing(input.pricingPeriods || []);
      if (error) {
        return {
          success: false,
          error,
        };
      }
    }

    const app = sanitizeCourtAppFields(input as unknown as Record<string, unknown>);
    if (!app.ok) return { success: false, error: app.error };

    const court = await Court.create({
      name: input.name,
      type: input.type,
      image: input.image || '', // Empty → the app falls back to the sport photo
      description: input.description,
      ...app.value,
      pricePerHour: input.pricePerHour,
      weekendPricePerHour: input.weekendPricePerHour ?? null,
      isActive: true,
      timeBasedPricingEnabled: input.timeBasedPricingEnabled ?? false,
      pricingPeriods: input.pricingPeriods ?? [],
    });

    await audit({ actor: gate, area: "courts", action: "create", targetId: court._id, targetLabel: court.name, summary: `Added court ${court.name}`, after: snapshot(court) });

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
  /** Saturday and Sunday price. Empty = same as pricePerHour. */
  weekendPricePerHour?: number | null;
  isActive?: boolean;
  timeBasedPricingEnabled?: boolean;
  pricingPeriods?: CourtPricingPeriod[];
  surfaceLabel?: string;
  isIndoor?: boolean;
  hasRacketRental?: boolean;
  /** Feature objects, or just keys (labels are filled in). */
  features?: Array<CourtFeature | string>;
  highlight?: CourtFeature | string | null;
}

export async function updateCourt(input: UpdateCourtInput, opts?: StaffActorOpts) {
  try {
    const gate = await requireStaffActor(opts, { superAdmin: true });
    if (!gate.ok) return { success: false, error: gate.error };
    await connectDB();

    const { courtId, ...updateData } = input;

    const app = sanitizeCourtAppFields(updateData as unknown as Record<string, unknown>);
    if (!app.ok) return { success: false, error: app.error };
    Object.assign(updateData, app.value);

    const weekendError = cleanWeekendPrices(updateData);
    if (weekendError) return { success: false, error: weekendError };

    if (updateData.timeBasedPricingEnabled) {
      const error = validateTimeBasedPricing(updateData.pricingPeriods || []);
      if (error) {
        return {
          success: false,
          error,
        };
      }
    }

    const before = await Court.findById(courtId);
    const court = await Court.findByIdAndUpdate(
      courtId,
      updateData,
      { new: true, runValidators: true }
    );

    if (!court) {
      throw new Error('Court not found');
    }
    await audit({
      actor: gate,
      area: "courts",
      action: "update",
      targetId: court._id,
      targetLabel: court.name,
      summary: `Changed court ${court.name}`,
      before: snapshot(before),
      after: snapshot(court),
    });

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

export async function deleteCourt(courtId: string, opts?: StaffActorOpts) {
  try {
    const gate = await requireStaffActor(opts, { superAdmin: true });
    if (!gate.ok) return { success: false, error: gate.error };
    await connectDB();

    const court = await Court.findByIdAndDelete(courtId);

    if (!court) {
      throw new Error('Court not found');
    }
    await audit({ actor: gate, area: "courts", action: "delete", targetId: court._id, targetLabel: court.name, summary: `Deleted court ${court.name}`, before: snapshot(court) });

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

