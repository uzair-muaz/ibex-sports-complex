'use server';

import { deleteUnusedPhotos } from "@/lib/media";
import { getAppSettings } from "@/lib/app-settings";
import { audit, snapshot } from '@/lib/audit';
import connectDB from '@/lib/mongodb';
import Court from '@/models/Court';
import type { CourtFeature } from '@/models/Court';
import { sanitizeCourtAppFields } from '@/lib/court-app-fields';
import { safeRevalidatePath } from '@/lib/safe-revalidate';
import type { CourtPricingPeriod } from '@/types';
import { checkPricingPeriods } from '@/lib/pricing-periods';
import { requireStaffActor, type StaffActorOpts } from '@/lib/action-auth';

/** A court's sport must be one listed in App Settings (built-in or added). */
async function checkSportExists(type: unknown): Promise<string | null> {
  const { sports } = await getAppSettings();
  return sports.some((s) => s.sport === type) ? null : "Choose a sport from the list (add new sports in App Settings).";
}

/** Weekend prices: empty means "same as weekday". Cleans them in place; returns an error or null. */
function cleanWeekendPrices(input: { weekendPricePerHour?: number | null; priceUnitMinutes?: number | null; pricingPeriods?: CourtPricingPeriod[] }): string | null {
  const clean = (v: unknown): number | null | undefined | "bad" => {
    if (v === undefined) return undefined;
    if (v === null || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 && n <= 1_000_000 ? n : "bad";
  };
  const base = clean(input.weekendPricePerHour);
  if (base === "bad") return "Weekend price must be a number of 0 or more.";
  const unit = (input as { priceUnitMinutes?: unknown }).priceUnitMinutes;
  if (unit !== undefined && unit !== null && unit !== 60 && unit !== 90) return "Price must be for 60 or 90 minutes.";
  if (base !== undefined) input.weekendPricePerHour = base;
  for (const p of input.pricingPeriods ?? []) {
    const w = clean(p.weekendPricePerHour);
    if (w === "bad") return "Weekend price for a peak/off-peak period must be a number of 0 or more.";
    p.weekendPricePerHour = w ?? null;
  }
  return null;
}

/** No gaps and no overlaps between peak/off-peak times (see lib/pricing-periods). */
const validateTimeBasedPricing = checkPricingPeriods;

export async function getCourts(type?: string) {
  try {
    await connectDB();

    const query: Record<string, unknown> = { isActive: true };
    if (type) {
      query.type = type;
    }

    const courts = await Court.find(query).sort({ createdAt: 1 });

    return {
      success: true,
      courts: JSON.parse(JSON.stringify(courts)),
    };
  } catch (caught) {
    const error = caught as Error;
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
  } catch (caught) {
    const error = caught as Error;
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
  type: string;
  image?: string; // Images are hardcoded, optional
  description: string;
  pricePerHour: number;
  /** Saturday and Sunday price. Empty = same as pricePerHour. */
  weekendPricePerHour?: number | null;
  /** Minutes the price is for: 60 or 90. Empty = 90 for Futsal, else 60. */
  priceUnitMinutes?: number | null;
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
    const sportError = await checkSportExists(input.type);
    if (sportError) return { success: false, error: sportError };

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
      priceUnitMinutes: input.priceUnitMinutes ?? null,
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
  } catch (caught) {
    const error = caught as Error;
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
  type?: string;
  image?: string;
  description?: string;
  pricePerHour?: number;
  /** Saturday and Sunday price. Empty = same as pricePerHour. */
  weekendPricePerHour?: number | null;
  /** Minutes the price is for: 60 or 90. Empty = 90 for Futsal, else 60. */
  priceUnitMinutes?: number | null;
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
    if (updateData.type !== undefined) {
      const sportError = await checkSportExists(updateData.type);
      if (sportError) return { success: false, error: sportError };
    }

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
    if (before?.image && before.image !== court.image) await deleteUnusedPhotos([before.image]);
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
  } catch (caught) {
    const error = caught as Error;
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
    await deleteUnusedPhotos([court.image]);
    await audit({ actor: gate, area: "courts", action: "delete", targetId: court._id, targetLabel: court.name, summary: `Deleted court ${court.name}`, before: snapshot(court) });

    safeRevalidatePath('/admin');
    safeRevalidatePath('/');

    return {
      success: true,
    };
  } catch (caught) {
    const error = caught as Error;
    console.error('Delete court error:', error);
    return {
      success: false,
      error: error.message || 'Failed to delete court',
    };
  }
}

