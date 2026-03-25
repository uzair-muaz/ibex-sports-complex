/**
 * Email Service
 * 
 * This module handles sending emails using either Resend or AWS SES.
 * Set EMAIL_PROVIDER env variable to 'ses' to use AWS SES, otherwise defaults to Resend.
 */

import { Resend } from 'resend';
import { SESClient, SendRawEmailCommand } from '@aws-sdk/client-ses';
import { generateBookingConfirmationEmail, BookingEmailData, AppliedDiscountEmail } from './email-templates/booking-confirmation';

// QR Code generation
let QRCode: any;
try {
  QRCode = require('qrcode');
} catch (e) {
  console.warn('qrcode package not installed. QR codes in emails will not be generated.');
}

// Email provider configuration
const EMAIL_PROVIDER = process.env.EMAIL_PROVIDER || 'resend'; // 'resend' or 'ses'

// Resend configuration
const resend = new Resend(process.env.RESEND_API_KEY);
const resendFromEmail = process.env.RESEND_FROM_EMAIL || 'IBEX Sports <onboarding@resend.dev>';

// SES configuration (kept for future use)
const sesClient = new SESClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY || '',
    secretAccessKey: process.env.AWS_SECRET_KEY || '',
  },
});
const sesFromEmail = process.env.SES_FROM_EMAIL || 'noreply@ibexarena.com';

/**
 * Generates QR code as base64 data URL
 */
async function generateQRCodeDataUrl(value: string): Promise<string> {
  try {
    if (!QRCode) {
      throw new Error('QRCode package not available');
    }
    const qrColor = { ["dark"]: "#000000", ["light"]: "#FFFFFF" };
    const dataUrl = await QRCode.toDataURL(value, {
      width: 300,
      margin: 3,
      errorCorrectionLevel: 'M',
      color: qrColor,
    });
    return dataUrl;
  } catch (error) {
    console.error('Error generating QR code:', error);
    // Return a placeholder
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  }
}

/**
 * Generates QR code as buffer (for SES inline attachments)
 */
async function generateQRCodeBuffer(value: string): Promise<Buffer> {
  try {
    if (!QRCode) {
      throw new Error('QRCode package not available');
    }
    const qrColor = { ["dark"]: "#000000", ["light"]: "#FFFFFF" };
    const buffer = await QRCode.toBuffer(value, {
      width: 300,
      margin: 3,
      errorCorrectionLevel: 'M',
      color: qrColor,
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
  originalPrice?: number;
  discounts?: AppliedDiscountEmail[];
  discountAmount?: number;
  totalPrice: number;
  bookingId: string;
  baseUrl: string;
}

/**
 * Send email via Resend
 */
async function sendViaResend(
  data: BookingConfirmationEmailData
): Promise<{ success: boolean; message?: string; emailId?: string }> {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY is not configured');
      return { success: false, message: 'Email service is not configured' };
    }

    const validEmail = data.userEmail.trim().toLowerCase();

    // Generate QR code URLs
    const entryVerificationUrl = `${data.baseUrl}/booking/verify/${data.bookingId}`;
    const feedbackUrl = `${data.baseUrl}/feedback/${data.bookingId}`;

    // Generate QR codes as data URLs for embedding in HTML
    const entryQRCode = await generateQRCodeDataUrl(entryVerificationUrl);
    const feedbackQRCode = await generateQRCodeDataUrl(feedbackUrl);

    // Prepare email data
    const emailData: BookingEmailData = {
      userName: data.userName,
      userEmail: validEmail,
      courtName: data.courtName,
      date: data.date,
      startTime: data.startTime,
      duration: data.duration,
      originalPrice: data.originalPrice,
      discounts: data.discounts,
      discountAmount: data.discountAmount,
      totalPrice: data.totalPrice,
      bookingId: data.bookingId,
      entryVerificationUrl,
      feedbackUrl,
      entryQRCode, // Data URL for inline display
      feedbackQRCode, // Data URL for inline display
    };

    // Generate HTML email content
    const htmlContent = generateBookingConfirmationEmail(emailData);

    // Format for subject
    const startTimeFormatted = `${Math.floor(data.startTime).toString().padStart(2, '0')}:${data.startTime % 1 === 0 ? '00' : '30'}`;
    const formattedDate = new Date(data.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    const subject = `Booking Confirmed - IBEX Sports Complex - ${formattedDate} at ${startTimeFormatted}`;

    // Send via Resend
    const response = await resend.emails.send({
      from: resendFromEmail,
      to: validEmail,
      subject,
      html: htmlContent,
    });

    if (response.error) {
      console.error('Resend error:', response.error);
      return { success: false, message: response.error.message };
    }

    return {
      success: true,
      emailId: response.data?.id,
    };
  } catch (error: any) {
    console.error('Error sending email via Resend:', error);
    return {
      success: false,
      message: error.message || 'Failed to send email',
    };
  }
}

/**
 * Send email via AWS SES (kept for future use)
 */
async function sendViaSES(
  data: BookingConfirmationEmailData
): Promise<{ success: boolean; message?: string; emailId?: string }> {
  try {
    // Validate required environment variables
    if (!process.env.AWS_REGION || !process.env.AWS_ACCESS_KEY || !process.env.AWS_SECRET_KEY || !process.env.SES_FROM_EMAIL) {
      console.error('AWS SES configuration is missing. Please check your environment variables.');
      return { success: false, message: 'Email service is not configured' };
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
      originalPrice: data.originalPrice,
      discounts: data.discounts,
      discountAmount: data.discountAmount,
      totalPrice: data.totalPrice,
      bookingId: data.bookingId,
      entryVerificationUrl,
      feedbackUrl,
      entryQRCode: 'cid:entry-qr-code',
      feedbackQRCode: 'cid:feedback-qr-code',
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
    
    const previewText = `Your booking for ${data.courtName} on ${formattedDate} at ${startTimeFormatted} has been confirmed.`;

    // Create MIME multipart message with inline attachments
    const mainBoundary = `----=_NextPart_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const relatedBoundary = `----=_Related_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const subject = `Booking Confirmed - IBEX Sports Complex - ${formattedDate} at ${startTimeFormatted}`;
    
    const entryQRCodeBase64 = entryQRCodeBuffer.toString('base64');
    const feedbackQRCodeBase64 = feedbackQRCodeBuffer.toString('base64');

    const rawMessage = [
      `From: ${sesFromEmail}`,
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

/**
 * Sends booking confirmation email with QR codes
 * Uses Resend by default, or AWS SES if EMAIL_PROVIDER is set to 'ses'
 * 
 * @param data - Booking information and user details
 * @returns Promise with success status and email ID or error message
 */
export async function sendBookingConfirmationEmail(
  data: BookingConfirmationEmailData
): Promise<{ success: boolean; message?: string; emailId?: string }> {
  // Validate email address
  if (!data.userEmail || !data.userEmail.trim() || !data.userEmail.includes('@')) {
    console.error('Invalid email address:', data.userEmail);
    return { success: false, message: 'Invalid email address' };
  }

  // Use the configured email provider
  if (EMAIL_PROVIDER === 'ses') {
    return sendViaSES(data);
  }
  
  // Default to Resend
  return sendViaResend(data);
}
