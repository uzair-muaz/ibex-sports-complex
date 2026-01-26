import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import connectDB from '@/lib/mongodb';
import Court from '@/models/Court';
import { isBuildTime } from '@/lib/build-utils';

// Mark this route as dynamic to prevent static analysis during build
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function checkAuth(request: NextRequest, requireAdmin = false) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (requireAdmin) {
    if (!token) {
      return { authorized: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
    }

    const userRole = (token as { role?: string })?.role;
    if (userRole !== 'super_admin' && userRole !== 'admin') {
      return { authorized: false, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
    }
  }

  return { authorized: true, token };
}

export async function GET(request: NextRequest) {
  if (isBuildTime()) {
    return NextResponse.json([], {
      headers: {
        'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=899',
      },
    });
  }

  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as 'PADEL' | 'CRICKET' | 'PICKLEBALL' | 'FUTSAL' | null;
    const all = searchParams.get('all') === 'true';

    await connectDB();

    const query: any = all ? {} : { isActive: true };
    if (type) {
      query.type = type;
    }

    const courts = await Court.find(query)
      .sort({ createdAt: 1 })
      .maxTimeMS(10000)
      .lean();

    return NextResponse.json(
      { success: true, courts },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=899',
        },
      }
    );
  } catch (error: any) {
    console.error('Get courts error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch courts', courts: [] },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  if (isBuildTime()) {
    return NextResponse.json(
      { success: false, error: 'Cannot create court during build' },
      { status: 503 }
    );
  }

  const authCheck = await checkAuth(request, true);
  if (!authCheck.authorized) {
    return authCheck.response;
  }

  try {
    const body = await request.json();
    const { name, type, image, description, pricePerHour } = body;

    if (!name || !type || !description || pricePerHour === undefined) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    await connectDB();

    const court = await Court.create({
      name,
      type,
      image: image || '',
      description,
      pricePerHour,
      isActive: true,
    });

    return NextResponse.json({
      success: true,
      court: JSON.parse(JSON.stringify(court)),
    });
  } catch (error: any) {
    console.error('Create court error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create court' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  if (isBuildTime()) {
    return NextResponse.json(
      { success: false, error: 'Cannot update court during build' },
      { status: 503 }
    );
  }

  const authCheck = await checkAuth(request, true);
  if (!authCheck.authorized) {
    return authCheck.response;
  }

  try {
    const body = await request.json();
    const { courtId, ...updateData } = body;

    if (!courtId) {
      return NextResponse.json(
        { success: false, error: 'Court ID is required' },
        { status: 400 }
      );
    }

    await connectDB();

    const court = await Court.findByIdAndUpdate(
      courtId,
      updateData,
      { new: true, runValidators: true }
    );

    if (!court) {
      return NextResponse.json(
        { success: false, error: 'Court not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      court: JSON.parse(JSON.stringify(court)),
    });
  } catch (error: any) {
    console.error('Update court error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update court' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  if (isBuildTime()) {
    return NextResponse.json(
      { success: false, error: 'Cannot delete court during build' },
      { status: 503 }
    );
  }

  const authCheck = await checkAuth(request, true);
  if (!authCheck.authorized) {
    return authCheck.response;
  }

  try {
    const { searchParams } = new URL(request.url);
    const courtId = searchParams.get('id');

    if (!courtId) {
      return NextResponse.json(
        { success: false, error: 'Court ID is required' },
        { status: 400 }
      );
    }

    await connectDB();

    const court = await Court.findByIdAndDelete(courtId);

    if (!court) {
      return NextResponse.json(
        { success: false, error: 'Court not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error: any) {
    console.error('Delete court error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete court' },
      { status: 500 }
    );
  }
}
