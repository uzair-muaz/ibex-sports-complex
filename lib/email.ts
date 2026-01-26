/**
 * AWS SES Email Service
 * 
 * This module handles sending emails using Amazon SES (Simple Email Service).
 * It provides functions to send booking confirmation emails with QR codes.
 */

import { SESClient, SendRawEmailCommand } from '@aws-sdk/client-ses';
import { generateBookingConfirmationEmail, BookingEmailData } from './email-templates/booking-confirmation';
// Note: Install 'qrcode' package for server-side QR code generation: npm install qrcode @types/qrcode
// Using dynamic import to handle cases where package might not be installed yet
let QRCode: any;
try {
  QRCode = require('qrcode');
} catch (e) {
  // QRCode package not installed - will use fallback
  console.warn('qrcode package not installed. QR codes in emails will not be generated.');
}

// Initialize SES client with credentials from environment variables
const sesClient = new SESClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY || '',
    secretAccessKey: process.env.AWS_SECRET_KEY || '',
  },
});

const fromEmail = process.env.SES_FROM_EMAIL || 'noreply@ibexarena.com';

/**
 * Generates QR code as buffer (for email inline attachments)
 * Requires 'qrcode' package to be installed
 */
async function generateQRCodeBuffer(value: string): Promise<Buffer> {
  try {
    if (!QRCode) {
      throw new Error('QRCode package not available');
    }
    // Generate QR code as buffer for email inline attachments
    const buffer = await QRCode.toBuffer(value, {
      width: 300,
      margin: 3,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
      type: 'image/png',
    });
    
    return buffer;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw error;
  }
}

/**
 * Extended booking email data interface
 */
export interface BookingConfirmationEmailData {
  userName: string;
  userEmail: string;
  courtName: string;
  date: string;
  startTime: number;
  duration: number;
  totalPrice: number;
  bookingId: string;
  baseUrl: string;
}

/**
 * Sends booking confirmation email with QR codes
 * 
 * @param data - Booking information and user details
 * @returns Promise with success status and email ID or error message
 */
export async function sendBookingConfirmationEmail(
  data: BookingConfirmationEmailData
): Promise<{ success: boolean; message?: string; emailId?: string }> {
  try {
    // Validate required environment variables
    if (!process.env.AWS_REGION || !process.env.AWS_ACCESS_KEY || !process.env.AWS_SECRET_KEY || !process.env.SES_FROM_EMAIL) {
      console.error('AWS SES configuration is missing. Please check your environment variables.');
      return { success: false, message: 'Email service is not configured' };
    }

    // Validate email address
    if (!data.userEmail || !data.userEmail.trim() || !data.userEmail.includes('@')) {
      console.error('Invalid email address:', data.userEmail);
      return { success: false, message: 'Invalid email address' };
    }

    const validEmail = data.userEmail.trim().toLowerCase();

    // Generate QR code URLs
    const entryVerificationUrl = `${data.baseUrl}/booking/verify/${data.bookingId}`;
    const feedbackUrl = `${data.baseUrl}/feedback/${data.bookingId}`;

    // Generate QR codes as buffers for inline attachments
    let entryQRCodeBuffer: Buffer;
    let feedbackQRCodeBuffer: Buffer;
    
    try {
      entryQRCodeBuffer = await generateQRCodeBuffer(entryVerificationUrl);
      feedbackQRCodeBuffer = await generateQRCodeBuffer(feedbackUrl);
    } catch (error) {
      console.error('Failed to generate QR codes:', error);
      // Create a simple 1x1 transparent PNG as placeholder
      const placeholder = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
      entryQRCodeBuffer = placeholder;
      feedbackQRCodeBuffer = placeholder;
    }

    // Prepare email data (QR codes will be referenced via CID in HTML)
    const emailData: BookingEmailData = {
      userName: data.userName,
      userEmail: validEmail,
      courtName: data.courtName,
      date: data.date,
      startTime: data.startTime,
      duration: data.duration,
      totalPrice: data.totalPrice,
      bookingId: data.bookingId,
      entryVerificationUrl,
      feedbackUrl,
      entryQRCode: 'cid:entry-qr-code', // CID reference for inline attachment
      feedbackQRCode: 'cid:feedback-qr-code', // CID reference for inline attachment
    };

    // Generate HTML email content
    const htmlContent = generateBookingConfirmationEmail(emailData);

    // Format time for email subject
    const startTimeFormatted = `${Math.floor(data.startTime).toString().padStart(2, '0')}:${data.startTime % 1 === 0 ? '00' : '30'}`;
    const formattedDate = new Date(data.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    
    // Create preview text to help prevent Gmail from collapsing
    const previewText = `Your booking for ${data.courtName} on ${formattedDate} at ${startTimeFormatted} has been confirmed.`;

    // Create MIME multipart message with inline attachments (required for Gmail)
    const mainBoundary = `----=_NextPart_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const relatedBoundary = `----=_Related_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const subject = `Booking Confirmed - IBEX Sports Complex - ${formattedDate} at ${startTimeFormatted}`;
    
    // Convert buffers to base64 for MIME encoding
    const entryQRCodeBase64 = entryQRCodeBuffer.toString('base64');
    const feedbackQRCodeBase64 = feedbackQRCodeBuffer.toString('base64');

    // Build raw email message with proper MIME formatting
    // Using multipart/alternative with text/plain and multipart/related for HTML+images
    const rawMessage = [
      `From: ${fromEmail}`,
      `To: ${validEmail}`,
      `Subject: ${subject}`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/alternative; boundary="${mainBoundary}"`,
      ``,
      `--${mainBoundary}`,
      `Content-Type: text/plain; charset=UTF-8`,
      `Content-Transfer-Encoding: 7bit`,
      ``,
      previewText,
      ``,
      `--${mainBoundary}`,
      `Content-Type: multipart/related; boundary="${relatedBoundary}"`,
      ``,
      `--${relatedBoundary}`,
      `Content-Type: text/html; charset=UTF-8`,
      `Content-Transfer-Encoding: 7bit`,
      ``,
      htmlContent,
      ``,
      `--${relatedBoundary}`,
      `Content-Type: image/png`,
      `Content-Transfer-Encoding: base64`,
      `Content-ID: <entry-qr-code>`,
      `Content-Disposition: inline; filename="entry-qr-code.png"`,
      ``,
      entryQRCodeBase64.match(/.{1,76}/g)?.join('\r\n') || entryQRCodeBase64,
      ``,
      `--${relatedBoundary}`,
      `Content-Type: image/png`,
      `Content-Transfer-Encoding: base64`,
      `Content-ID: <feedback-qr-code>`,
      `Content-Disposition: inline; filename="feedback-qr-code.png"`,
      ``,
      feedbackQRCodeBase64.match(/.{1,76}/g)?.join('\r\n') || feedbackQRCodeBase64,
      ``,
      `--${relatedBoundary}--`,
      ``,
      `--${mainBoundary}--`,
    ].join('\r\n');

    // Send email using SES Raw Email (required for inline attachments)
    const command = new SendRawEmailCommand({
      RawMessage: {
        Data: Buffer.from(rawMessage),
      },
    });

    const response = await sesClient.send(command);

    return {
      success: true,
      emailId: response.MessageId,
    };
  } catch (error: any) {
    console.error('Error sending email via SES:', error);
    
    // Provide user-friendly error messages
    let errorMessage = 'Failed to send email';
    
    if (error.name === 'MessageRejected') {
      if (error.message?.includes('not verified')) {
        errorMessage = 'Email address is not verified in AWS SES. Please verify the recipient email address in AWS SES console, or request production access to send to any email address.';
      } else {
        errorMessage = 'Email was rejected by AWS SES. Please check your SES configuration.';
      }
    } else if (error.name === 'ValidationError') {
      errorMessage = 'Invalid email configuration. Please check your AWS SES settings.';
    } else {
      errorMessage = error.message || 'Failed to send email';
    }
    
    return {
      success: false,
      message: errorMessage,
    };
  }
}
