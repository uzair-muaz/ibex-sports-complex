'use server';

import { sendEmail } from './ses';
import { renderEmailTemplate } from './template-renderer';
import { generateBookingQRCodes } from './qrcode';
import { getBaseUrl } from '../utils';

/**
 * Data structure for booking confirmation email
 */
export interface BookingConfirmationEmailData {
  userName: string;
  userEmail: string;
  courtName: string;
  date: string; // YYYY-MM-DD format
  startTime: number; // Hour (0-23) with 0.5 for 30 minutes
  duration: number; // Hours (can be 1, 1.5, 2, etc.)
  totalPrice: number;
  bookingId: string; // MongoDB ObjectId
  amountPaid?: number;
}

/**
 * Converts time from numeric format (e.g., 14.5) to readable format (e.g., "14:30 - 16:30")
 * @param startTime - Start hour (0-23) with 0.5 for 30 minutes
 * @param duration - Duration in hours
 * @returns Formatted time string
 */
function formatTime(startTime: number, duration: number): string {
  const startHour = Math.floor(startTime);
  const startMin = startTime % 1 === 0 ? '00' : '30';
  const endTime = startTime + duration;
  const endHour = Math.floor(endTime);
  const endMin = endTime % 1 === 0 ? '00' : '30';
  
  return `${startHour.toString().padStart(2, '0')}:${startMin} - ${endHour.toString().padStart(2, '0')}:${endMin}`;
}

/**
 * Converts date from YYYY-MM-DD format to readable format (e.g., "Monday, January 15, 2024")
 * @param dateString - Date in YYYY-MM-DD format
 * @returns Formatted date string
 */
function formatDate(dateString: string): string {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Formats price with thousand separators and 2 decimal places (e.g., "10,000.00")
 * @param price - Price as number
 * @returns Formatted price string
 */
function formatPrice(price: number): string {
  return price.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Sends booking confirmation email with embedded QR codes
 * 
 * Process:
 * 1. Generates two QR codes (entry verification and feedback) as base64 images
 * 2. Formats booking data for the email template
 * 3. Renders the HTML email template with all variables replaced
 * 4. Sends email via AWS SES
 * 
 * Note: Email sending failures are logged but don't break the booking creation flow
 * 
 * @param data - Booking confirmation email data
 * @returns Result object with success status and message ID or error
 */
export async function sendBookingConfirmationEmail(
  data: BookingConfirmationEmailData
) {
  try {
    // Get base URL for generating QR code links
    const baseUrl = getBaseUrl();
    
    // Generate QR codes as base64 data URLs for embedding in email
    // Entry verification QR links to /booking/verify/{bookingId}
    // Feedback QR links to /feedback/{bookingId}
    const qrCodes = await generateBookingQRCodes(data.bookingId, baseUrl);
    
    // Prepare template variables by formatting all booking data
    const templateVariables = {
      userName: data.userName,
      courtName: data.courtName,
      date: formatDate(data.date),
      time: formatTime(data.startTime, data.duration),
      duration: data.duration.toString(),
      totalPrice: formatPrice(data.totalPrice),
      bookingId: data.bookingId.slice(-8), // Show last 8 characters for readability
      entryQRCode: qrCodes.entryVerification, // Base64 data URL
      feedbackQRCode: qrCodes.feedback, // Base64 data URL
    };
    
    // Load HTML template and replace all {{variable}} placeholders with actual values
    const htmlContent = await renderEmailTemplate(
      'booking-confirmation.html',
      templateVariables
    );
    
    // Send email via AWS SES
    const result = await sendEmail({
      to: data.userEmail,
      subject: `Booking Confirmed - IBEX Sports Arena`,
      html: htmlContent,
    });
    
    if (!result.success) {
      console.error('Failed to send booking confirmation email:', result.error);
      // Return failure but don't throw - booking creation should succeed even if email fails
      return {
        success: false,
        error: result.error,
      };
    }
    
    return {
      success: true,
      messageId: result.messageId,
    };
  } catch (error: any) {
    console.error('Email sending error:', error);
    // Return failure but don't throw - booking creation should succeed even if email fails
    return {
      success: false,
      error: error.message || 'Failed to send email',
    };
  }
}
