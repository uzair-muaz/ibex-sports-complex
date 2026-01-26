import { NextResponse } from 'next/server';

/**
 * Health check endpoint for bookings API
 * Returns immediately without database connection
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'bookings-api',
  });
}
