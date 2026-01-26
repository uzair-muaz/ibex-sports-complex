import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/mongodb';
import Booking from '@/models/Booking';
import Court from '@/models/Court';
import { isBuildTime } from '@/lib/build-utils';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Disable all caching
export const revalidate = 0;
export const fetchCache = 'force-no-store';

/**
 * Simple GET endpoint for bookings
 * PUBLIC ENDPOINT - No authentication required
 * Starting simple - just basic query, no lookups
 */
export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString();
  console.log('='.repeat(80));
  console.log(`[${timestamp}] [GET /api/bookings] ===== REQUEST RECEIVED =====`);
  console.log(`[GET /api/bookings] Method: ${request.method}`);
  console.log(`[GET /api/bookings] URL: ${request.url}`);
  console.log(`[GET /api/bookings] Headers:`, Object.fromEntries(request.headers.entries()));
  console.log(`[GET /api/bookings] NextURL pathname: ${request.nextUrl.pathname}`);
  console.log(`[GET /api/bookings] NextURL searchParams: ${request.nextUrl.searchParams.toString()}`);
  
  if (isBuildTime()) {
    console.log('[GET /api/bookings] Build time detected - returning empty');
    return NextResponse.json({
      success: true,
      bookings: [],
    });
  }

  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    console.log(`[GET /api/bookings] Extracted date param: "${date}"`);

    if (!date) {
      console.log('[GET /api/bookings] ERROR: No date parameter provided');
      return NextResponse.json(
        { success: false, error: 'Date parameter is required', bookings: [] },
        { status: 400 }
      );
    }

    console.log('[GET /api/bookings] Step 1: Connecting to DB...');
    const dbStart = Date.now();
    try {
      await connectDB();
      console.log(`[GET /api/bookings] Step 2: DB connected in ${Date.now() - dbStart}ms`);
    } catch (dbError: any) {
      console.error('[GET /api/bookings] DB connection failed:', dbError.message);
      return NextResponse.json({
        success: false,
        error: 'Database connection failed',
        bookings: [],
      }, { status: 503 });
    }

    // Ensure models are registered (important for Next.js)
    console.log('[GET /api/bookings] Step 2.5: Checking model registration...');
    try {
      if (!mongoose.models.Booking) {
        console.log('[GET /api/bookings] Booking model not registered, importing...');
        const _ = Booking;
      }
      if (!mongoose.models.Court) {
        console.log('[GET /api/bookings] Court model not registered, importing...');
        const _ = Court;
      }
      console.log('[GET /api/bookings] Models registered:', {
        Booking: !!mongoose.models.Booking,
        Court: !!mongoose.models.Court
      });
    } catch (modelError: any) {
      console.error('[GET /api/bookings] Model registration error:', modelError.message);
      return NextResponse.json({
        success: false,
        error: 'Model registration failed',
        bookings: [],
      }, { status: 500 });
    }

    console.log('[GET /api/bookings] Step 3: Testing simple count first...');
    try {
      const countStart = Date.now();
      const totalCount = await Promise.race([
        Booking.countDocuments({ date: date }).maxTimeMS(2000).exec(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Count timeout')), 2000)
        )
      ]) as number;
      console.log(`[GET /api/bookings] Count query completed in ${Date.now() - countStart}ms, found ${totalCount} total bookings for date`);
    } catch (countError: any) {
      console.error('[GET /api/bookings] Count query failed:', countError.message);
    }

    console.log('[GET /api/bookings] Step 4: Executing find query...');
    console.log('[GET /api/bookings] Query filter:', { date });
    
    // Simple query - match the working test endpoint pattern exactly
    const queryStart = Date.now();
    let bookings: any[] = [];
    
    try {
      // Use the EXACT same pattern as the working test endpoint
      // First, get all bookings for the date (no status filter initially)
      console.log('[GET /api/bookings] Attempting query (matching test endpoint pattern)...');
      const queryPromise = Booking.find({ date: date })
        .maxTimeMS(3000)
        .lean()
        .exec();
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Query timeout after 3 seconds')), 3000)
      );
      
      bookings = await Promise.race([queryPromise, timeoutPromise]) as any[];
      const queryTime = Date.now() - queryStart;
      console.log(`[GET /api/bookings] Query completed in ${queryTime}ms, found ${bookings.length} bookings`);
      
      // Filter out cancelled in memory (faster than DB query with $ne)
      if (bookings && bookings.length > 0) {
        const beforeFilter = bookings.length;
        bookings = bookings.filter((b: any) => b.status !== 'cancelled');
        console.log(`[GET /api/bookings] Filtered out cancelled: ${beforeFilter} -> ${bookings.length}`);
        
        // Sort in memory
        bookings.sort((a, b) => a.startTime - b.startTime);
        console.log('[GET /api/bookings] Sorted bookings in memory');
      }
    } catch (queryError: any) {
      const queryTime = Date.now() - queryStart;
      console.error(`[GET /api/bookings] Query failed after ${queryTime}ms:`, queryError.message);
      console.error('[GET /api/bookings] Query error stack:', queryError.stack);
      // Return empty array on query error instead of failing
      bookings = [];
    }

    console.log(`[GET /api/bookings] Step 4: Query completed. Found ${bookings?.length || 0} bookings`);
    
    if (bookings && bookings.length > 0) {
      console.log('[GET /api/bookings] Sample booking:', JSON.stringify(bookings[0], null, 2));
    }

    console.log('[GET /api/bookings] Step 5: Returning response...');
    const response = NextResponse.json({
      success: true,
      bookings: bookings || [],
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'Content-Type': 'application/json',
      }
    });
    
    console.log(`[GET /api/bookings] ===== RESPONSE SENT (${bookings?.length || 0} bookings) =====`);
    console.log('='.repeat(80));
    return response;

  } catch (error: any) {
    console.error('[GET /api/bookings] ===== ERROR OCCURRED =====');
    console.error('[GET /api/bookings] Error message:', error.message);
    console.error('[GET /api/bookings] Error stack:', error.stack);
    console.error('='.repeat(80));
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch bookings',
      bookings: [],
    }, { 
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      }
    });
  }
}

/**
 * POST endpoint for creating bookings
 */
export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString();
  console.log('='.repeat(80));
  console.log(`[${timestamp}] [POST /api/bookings] ===== REQUEST RECEIVED =====`);
  console.log(`[POST /api/bookings] Method: ${request.method}`);
  console.log(`[POST /api/bookings] URL: ${request.url}`);
  
  if (isBuildTime()) {
    return NextResponse.json(
      { success: false, error: 'Cannot create booking during build' },
      { status: 503 }
    );
  }

  try {
    console.log('[POST /api/bookings] Step 1: Parsing request body...');
    const body = await request.json();
    console.log('[POST /api/bookings] Body received:', { 
      courtType: body.courtType, 
      date: body.date, 
      startTime: body.startTime,
      duration: body.duration,
      hasUserName: !!body.userName,
      hasUserEmail: !!body.userEmail,
      hasUserPhone: !!body.userPhone
    });
    const {
      courtType,
      date,
      startTime,
      duration,
      userName,
      userEmail,
      userPhone,
    } = body;

    if (!courtType || !date || startTime === undefined || !duration || !userName || !userEmail || !userPhone) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!userPhone || userPhone.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Phone number is required' },
        { status: 400 }
      );
    }

    if (duration < 1) {
      return NextResponse.json(
        { success: false, error: 'Minimum booking time is 1 hour' },
        { status: 400 }
      );
    }

    if (duration % 0.5 !== 0) {
      return NextResponse.json(
        { success: false, error: 'Duration must be in 30-minute increments' },
        { status: 400 }
      );
    }

    // Connect DB
    console.log('[POST /api/bookings] Step 2: Connecting to DB...');
    try {
      await Promise.race([
        connectDB(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('DB timeout')), 2000))
      ]);
      console.log('[POST /api/bookings] DB connected');
    } catch (e: any) {
      console.error('[POST /api/bookings] DB connection failed:', e?.message);
      return NextResponse.json(
        { success: false, error: 'Database unavailable' },
        { status: 503 }
      );
    }

    // Ensure models are registered
    console.log('[POST /api/bookings] Step 2.5: Checking model registration...');
    if (!mongoose.models.Booking) {
      const _ = Booking;
    }
    if (!mongoose.models.Court) {
      const _ = Court;
    }
    console.log('[POST /api/bookings] Models registered:', {
      Booking: !!mongoose.models.Booking,
      Court: !!mongoose.models.Court
    });

    // Find available courts
    console.log('[POST /api/bookings] Step 3: Finding available courts...');
    const courtsStart = Date.now();
    const availableCourts = await Promise.race([
      Court.find({
        type: courtType,
        isActive: true,
      })
        .sort({ createdAt: 1 })
        .maxTimeMS(3000)
        .lean(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Courts query timeout')), 3000)
      )
    ]) as any[];
    console.log(`[POST /api/bookings] Found ${availableCourts.length} courts in ${Date.now() - courtsStart}ms`);

    if (availableCourts.length === 0) {
      return NextResponse.json(
        { success: false, error: `No ${courtType} courts available` },
        { status: 400 }
      );
    }

    // Check existing bookings using index
    console.log('[POST /api/bookings] Step 4: Checking existing bookings...');
    const bookingsStart = Date.now();
    const existingBookings = await Promise.race([
      Booking.find({
        date,
        status: { $ne: 'cancelled' },
      })
        .select('courtId startTime duration')
        .maxTimeMS(3000)
        .lean(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Bookings query timeout')), 3000)
      )
    ]) as any[];
    console.log(`[POST /api/bookings] Found ${existingBookings.length} existing bookings in ${Date.now() - bookingsStart}ms`);

    console.log('[POST /api/bookings] Step 4.5: Finding available court for time slot...');
    let assignedCourt = null;
    const endTime = startTime + duration;
    console.log(`[POST /api/bookings] Looking for court available from ${startTime} to ${endTime}`);

    for (const court of availableCourts) {
      console.log(`[POST /api/bookings] Checking court: ${court.name} (${court._id})`);
      const hasConflict = existingBookings.some((booking: any) => {
        if (booking.courtId.toString() !== court._id.toString()) {
          return false;
        }
        const bookingEndTime = booking.startTime + booking.duration;
        const conflicts = (
          (startTime >= booking.startTime && startTime < bookingEndTime) ||
          (booking.startTime >= startTime && booking.startTime < endTime) ||
          (startTime <= booking.startTime && endTime >= bookingEndTime)
        );
        if (conflicts) {
          console.log(`[POST /api/bookings] Conflict found: Court ${court.name} has booking from ${booking.startTime} to ${bookingEndTime}`);
        }
        return conflicts;
      });

      if (!hasConflict) {
        assignedCourt = court;
        console.log(`[POST /api/bookings] Court assigned: ${court.name} (${court._id})`);
        break;
      } else {
        console.log(`[POST /api/bookings] Court ${court.name} has conflict, trying next...`);
      }
    }

    if (!assignedCourt) {
      console.log('[POST /api/bookings] ERROR: No available court found for the time slot');
      return NextResponse.json(
        { success: false, error: 'No available courts for the selected time slot' },
        { status: 400 }
      );
    }

    const totalPrice = assignedCourt.pricePerHour * duration;
    console.log(`[POST /api/bookings] Total price calculated: ${totalPrice} (${assignedCourt.pricePerHour}/hr × ${duration}hrs)`);

    console.log('[POST /api/bookings] Step 5: Creating booking with data:', {
      courtId: assignedCourt._id.toString(),
      date,
      startTime,
      duration,
      userName,
      userEmail: userEmail.toLowerCase(),
      userPhone,
      totalPrice,
      status: 'pending_payment'
    });
    
    const createStart = Date.now();
    const booking = await Promise.race([
      Booking.create({
        courtId: assignedCourt._id,
        date,
        startTime,
        duration,
        userName,
        userEmail: userEmail.toLowerCase(),
        userPhone,
        totalPrice,
        amountPaid: 0,
        status: 'pending_payment',
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Booking creation timeout')), 5000)
      )
    ]) as any;
    console.log(`[POST /api/bookings] Booking created successfully in ${Date.now() - createStart}ms`);
    console.log(`[POST /api/bookings] Created booking ID: ${booking._id}`);

    // Send email in background (don't wait)
    import('@/lib/email').then(({ sendBookingConfirmationEmail }) => {
      sendBookingConfirmationEmail({
        userName,
        userEmail: userEmail.toLowerCase(),
        courtName: assignedCourt.name,
        date,
        startTime,
        duration,
        totalPrice,
        bookingId: booking._id.toString(),
        amountPaid: 0,
      }).catch((error: any) => {
        console.error('Failed to send email:', error);
      });
    });

    console.log('[POST /api/bookings] Step 6: Returning success response...');
    const response = NextResponse.json({
      success: true,
      booking: JSON.parse(JSON.stringify(booking)),
    });
    console.log('[POST /api/bookings] ===== RESPONSE SENT =====');
    console.log('='.repeat(80));
    return response;
  } catch (error: any) {
    console.error('[POST /api/bookings] ===== ERROR OCCURRED =====');
    console.error('[POST /api/bookings] Error message:', error.message);
    console.error('[POST /api/bookings] Error stack:', error.stack);
    console.error('='.repeat(80));
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to process request',
        bookings: [],
      },
      { 
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        }
      }
    );
  }
}
