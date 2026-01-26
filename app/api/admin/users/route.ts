import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import { isBuildTime } from '@/lib/build-utils';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function checkAuth(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    return { authorized: false, response: NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 }) };
  }

  const userRole = (token as { role?: string })?.role;
  if (userRole !== 'super_admin' && userRole !== 'admin') {
    return { authorized: false, response: NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 }) };
  }

  return { authorized: true, token };
}

export async function GET(request: NextRequest) {
  if (isBuildTime()) {
    return NextResponse.json({
      success: true,
      users: [],
    });
  }

  const authCheck = await checkAuth(request);
  if (!authCheck.authorized) {
    return authCheck.response;
  }

  try {
    await connectDB();

    const users = await User.find()
      .select('-password')
      .sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      users: JSON.parse(JSON.stringify(users)),
    });
  } catch (error: any) {
    console.error('Get all users error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch users',
        users: [],
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  if (isBuildTime()) {
    return NextResponse.json(
      { success: false, error: 'Cannot create user during build' },
      { status: 503 }
    );
  }

  const authCheck = await checkAuth(request);
  if (!authCheck.authorized) {
    return authCheck.response;
  }

  try {
    const body = await request.json();
    const { email, password, name, role } = body;

    if (!email || !password || !name || !role) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    await connectDB();

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      email: email.toLowerCase(),
      password: hashedPassword,
      name,
      role,
    });

    return NextResponse.json({
      success: true,
      user: JSON.parse(JSON.stringify(user)),
    });
  } catch (error: any) {
    console.error('Create user error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create user' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  if (isBuildTime()) {
    return NextResponse.json(
      { success: false, error: 'Cannot update user during build' },
      { status: 503 }
    );
  }

  const authCheck = await checkAuth(request);
  if (!authCheck.authorized) {
    return authCheck.response;
  }

  try {
    const body = await request.json();
    const { userId, password, ...updateData } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    await connectDB();

    const updatePayload: any = { ...updateData };

    if (password) {
      updatePayload.password = await bcrypt.hash(password, 10);
    }

    if (updatePayload.email) {
      updatePayload.email = updatePayload.email.toLowerCase();
    }

    const user = await User.findByIdAndUpdate(
      userId,
      updatePayload,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user: JSON.parse(JSON.stringify(user)),
    });
  } catch (error: any) {
    console.error('Update user error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update user' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  if (isBuildTime()) {
    return NextResponse.json(
      { success: false, error: 'Cannot delete user during build' },
      { status: 503 }
    );
  }

  const authCheck = await checkAuth(request);
  if (!authCheck.authorized) {
    return authCheck.response;
  }

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    await connectDB();

    const user = await User.findByIdAndDelete(userId);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error: any) {
    console.error('Delete user error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete user' },
      { status: 500 }
    );
  }
}
