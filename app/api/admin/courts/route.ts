import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import connectDB from '@/lib/mongodb';
import Court from '@/models/Court';
import { isBuildTime } from '@/lib/build-utils';

// Mark this route as dynamic to prevent static analysis during build
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  if (isBuildTime()) {
    return NextResponse.json({
      success: true,
      courts: [],
    });
  }
  try {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userRole = (token as { role?: string })?.role;
    if (userRole !== 'super_admin' && userRole !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    await connectDB();

    const courts = await Court.find()
      .sort({ createdAt: 1 })
      .maxTimeMS(10000)
      .lean();

    return NextResponse.json({
      success: true,
      courts: courts,
    });
  } catch (error: any) {
    console.error('Get all courts error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch courts',
        courts: [],
      },
      { status: 500 }
    );
  }
}
