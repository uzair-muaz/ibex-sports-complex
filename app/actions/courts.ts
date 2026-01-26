'use server';

import connectDB from '@/lib/mongodb';
import Court from '@/models/Court';
import { revalidatePath } from 'next/cache';
import { isBuildTime } from '@/lib/build-utils';

export async function getCourts(type?: 'PADEL' | 'CRICKET' | 'PICKLEBALL' | 'FUTSAL') {
  // CRITICAL: Skip database connection during build to prevent hanging
  // Next.js analyzes pages during build even with force-dynamic
  if (isBuildTime()) {
    return {
      success: true,
      courts: [],
    };
  }
  
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
  if (isBuildTime()) {
    return {
      success: true,
      courts: [],
    };
  }

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
}

export async function createCourt(input: CreateCourtInput) {
  if (isBuildTime()) {
    return {
      success: false,
      error: 'Cannot create court during build',
    };
  }

  try {
    await connectDB();

    const court = await Court.create({
      name: input.name,
      type: input.type,
      image: input.image || '', // Images are hardcoded, not stored
      description: input.description,
      pricePerHour: input.pricePerHour,
      isActive: true,
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
}

export async function updateCourt(input: UpdateCourtInput) {
  if (isBuildTime()) {
    return {
      success: false,
      error: 'Cannot update court during build',
    };
  }

  try {
    await connectDB();

    const { courtId, ...updateData } = input;

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
  if (isBuildTime()) {
    return {
      success: false,
      error: 'Cannot delete court during build',
    };
  }

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

