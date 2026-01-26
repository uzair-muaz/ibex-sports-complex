import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/mongodb';
import Booking from '@/models/Booking';
import Court from '@/models/Court';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Test endpoint to verify database connection and model queries work
 */
export async function GET(request: NextRequest) {
  console.log('[TEST] Starting test endpoint...');
  
  try {
    // Test 1: DB Connection
    console.log('[TEST] Step 1: Testing DB connection...');
    const dbStart = Date.now();
    await connectDB();
    console.log(`[TEST] DB connected in ${Date.now() - dbStart}ms`);
    
    // Test 2: Model Registration
    console.log('[TEST] Step 2: Testing model registration...');
    if (!mongoose.models.Booking) {
      const _ = Booking;
    }
    if (!mongoose.models.Court) {
      const _ = Court;
    }
    console.log('[TEST] Models registered:', {
      Booking: !!mongoose.models.Booking,
      Court: !!mongoose.models.Court
    });
    
    // Test 3: Simple count query
    console.log('[TEST] Step 3: Testing Booking.countDocuments()...');
    const countStart = Date.now();
    const totalBookings = await Promise.race([
      Booking.countDocuments().maxTimeMS(2000).exec(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Count timeout')), 2000)
      )
    ]) as number;
    console.log(`[TEST] Total bookings: ${totalBookings} (took ${Date.now() - countStart}ms)`);
    
    // Test 4: Simple find query (no filters)
    console.log('[TEST] Step 4: Testing Booking.find() with limit...');
    const findStart = Date.now();
    const sampleBookings = await Promise.race([
      Booking.find().limit(5).maxTimeMS(2000).lean().exec(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Find timeout')), 2000)
      )
    ]) as any[];
    console.log(`[TEST] Found ${sampleBookings.length} sample bookings (took ${Date.now() - findStart}ms)`);
    
    // Test 5: Date filter query
    console.log('[TEST] Step 5: Testing Booking.find() with date filter...');
    const dateFilterStart = Date.now();
    const dateBookings = await Promise.race([
      Booking.find({ date: '2026-01-26' }).limit(5).maxTimeMS(2000).lean().exec(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Date filter timeout')), 2000)
      )
    ]) as any[];
    console.log(`[TEST] Found ${dateBookings.length} bookings for date (took ${Date.now() - dateFilterStart}ms)`);
    
    return NextResponse.json({
      success: true,
      tests: {
        dbConnection: 'OK',
        modelRegistration: 'OK',
        totalBookings,
        sampleBookingsCount: sampleBookings.length,
        dateFilterBookingsCount: dateBookings.length,
      }
    });
    
  } catch (error: any) {
    console.error('[TEST] Error:', error.message);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}
