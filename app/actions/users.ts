'use server';

import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';
import { isBuildTime } from '@/lib/build-utils';

export interface CreateUserInput {
  email: string;
  password: string;
  name: string;
  role: 'super_admin' | 'admin' | 'user';
}

export async function createUser(input: CreateUserInput) {
  if (isBuildTime()) {
    return {
      success: false,
      error: 'Cannot create user during build',
    };
  }

  try {
    await connectDB();

    // Check if user already exists
    const existingUser = await User.findOne({ email: input.email.toLowerCase() });
    if (existingUser) {
      return {
        success: false,
        error: 'User with this email already exists',
      };
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(input.password, 10);

    const user = await User.create({
      email: input.email.toLowerCase(),
      password: hashedPassword,
      name: input.name,
      role: input.role,
    });

    revalidatePath('/admin');

    return {
      success: true,
      user: JSON.parse(JSON.stringify(user)),
    };
  } catch (error: any) {
    console.error('Create user error:', error);
    return {
      success: false,
      error: error.message || 'Failed to create user',
    };
  }
}

export interface UpdateUserInput {
  userId: string;
  email?: string;
  password?: string;
  name?: string;
  role?: 'super_admin' | 'admin' | 'user';
}

export async function updateUser(input: UpdateUserInput) {
  if (isBuildTime()) {
    return {
      success: false,
      error: 'Cannot update user during build',
    };
  }

  try {
    await connectDB();

    const { userId, password, ...updateData } = input;

    // Prepare update object with proper typing
    const updatePayload: Partial<{
      email: string;
      password: string;
      name: string;
      role: 'super_admin' | 'admin' | 'user';
    }> = { ...updateData };

    // If password is provided, hash it
    if (password) {
      updatePayload.password = await bcrypt.hash(password, 10);
    }

    // If email is provided, lowercase it
    if (updatePayload.email) {
      updatePayload.email = updatePayload.email.toLowerCase();
    }

    const user = await User.findByIdAndUpdate(
      userId,
      updatePayload,
      { new: true, runValidators: true }
    );

    if (!user) {
      throw new Error('User not found');
    }

    revalidatePath('/admin');

    return {
      success: true,
      user: JSON.parse(JSON.stringify(user)),
    };
  } catch (error: any) {
    console.error('Update user error:', error);
    return {
      success: false,
      error: error.message || 'Failed to update user',
    };
  }
}

export async function deleteUser(userId: string) {
  if (isBuildTime()) {
    return {
      success: false,
      error: 'Cannot delete user during build',
    };
  }

  try {
    await connectDB();

    const user = await User.findByIdAndDelete(userId);

    if (!user) {
      throw new Error('User not found');
    }

    revalidatePath('/admin');

    return {
      success: true,
    };
  } catch (error: any) {
    console.error('Delete user error:', error);
    return {
      success: false,
      error: error.message || 'Failed to delete user',
    };
  }
}

export async function getAllUsers() {
  if (isBuildTime()) {
    return {
      success: true,
      users: [],
    };
  }

  try {
    await connectDB();

    const users = await User.find()
      .select('-password') // Don't return passwords
      .sort({ createdAt: -1 });

    return {
      success: true,
      users: JSON.parse(JSON.stringify(users)),
    };
  } catch (error: any) {
    console.error('Get all users error:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch users',
      users: [],
    };
  }
}

