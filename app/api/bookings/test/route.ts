import { NextResponse } from 'next/server';

/**
 * Simple test endpoint to verify API routing works
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Bookings API test endpoint is working',
    timestamp: new Date().toISOString(),
  });
}
