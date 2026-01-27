import { NextResponse } from 'next/server';
import { sendBookingConfirmationSMS } from '@/lib/sms';
import { getBaseUrl } from '@/lib/utils';

/**
 * GET /api/test-sms
 * 
 * Test endpoint to send SMS to a hardcoded Pakistani number (03102222330)
 * This endpoint can be tested using Postman or any HTTP client.
 * 
 * Example: GET http://localhost:3000/api/test-sms
 */
export async function GET() {
  try {
    // Hardcoded test number
    const testPhoneNumber = '03102222330';
    
    // Create dummy booking data for testing
    const testData = {
      userName: 'Test User',
      userPhone: testPhoneNumber,
      courtName: 'Padel Court 1',
      date: new Date().toISOString().split('T')[0], // Today's date
      startTime: 14.0, // 2:00 PM
      duration: 2, // 2 hours
      totalPrice: 2000,
      bookingId: 'test-' + Date.now().toString(),
      baseUrl: getBaseUrl(),
    };

    // Send SMS
    const result = await sendBookingConfirmationSMS(testData);

    if (result.success) {
      return NextResponse.json(
        {
          success: true,
          message: 'SMS sent successfully',
          messageId: result.messageId,
          phoneNumber: testPhoneNumber,
          formattedPhone: '+923102222330', // Expected formatted number
          testData: {
            userName: testData.userName,
            courtName: testData.courtName,
            date: testData.date,
            time: '14:00 - 16:00',
            totalPrice: testData.totalPrice,
            bookingId: testData.bookingId,
          },
        },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.message || 'Failed to send SMS',
          phoneNumber: testPhoneNumber,
        },
        { status: 500 }
      );
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Test SMS API error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        phoneNumber: '03102222330',
      },
      { status: 500 }
    );
  }
}
