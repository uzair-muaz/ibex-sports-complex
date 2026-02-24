/**
 * AWS SNS SMS Service
 * 
 * This module handles sending SMS messages using Amazon SNS (Simple Notification Service).
 * It provides functions to send booking confirmation SMS messages.
 */

import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';

// Initialize SNS client with credentials from environment variables
const snsClient = new SNSClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY || '',
    secretAccessKey: process.env.AWS_SECRET_KEY || '',
  },
});

export interface BookingConfirmationSMSData {
  userName: string;
  userPhone: string;
  courtName: string;
  date: string;
  startTime: number;
  duration: number;
  totalPrice: number;
  bookingId: string;
  baseUrl: string;
}

/**
 * Formats phone number to E.164 format (required by AWS SNS)
 * Handles Pakistani phone numbers in various formats:
 * - 0310-2742230 -> +923102742230
 * - +92 310 2222330 -> +923102222330
 * - 923102742230 -> +923102742230
 * - 3102742230 -> +923102742230
 * 
 * @param phone - Phone number in any format
 * @returns Formatted phone number in E.164 format (+92XXXXXXXXXX)
 */
function formatPhoneNumber(phone: string): string {
  if (!phone || phone.trim().length === 0) {
    throw new Error('Phone number cannot be empty');
  }

  // Remove all spaces, dashes, parentheses, and other formatting characters except +
  let cleaned = phone.trim().replace(/[\s\-\(\)\.]/g, '');
  
  // Check if it already starts with +92 (already in correct format, just clean spaces)
  if (cleaned.startsWith('+92')) {
    // Extract the digits after +92
    const digits = cleaned.substring(3); // Remove '+92'
    // Pakistani mobile numbers are 10 digits after country code
    if (digits.length === 10 && /^[0-9]{10}$/.test(digits)) {
      return `+92${digits}`;
    } else {
      throw new Error(`Invalid Pakistani phone number length: ${digits.length} digits (expected 10 after +92)`);
    }
  }
  
  // Check if it starts with 92 (without +) - should be 12 digits total (92 + 10)
  if (cleaned.startsWith('92') && cleaned.length === 12 && /^92[0-9]{10}$/.test(cleaned)) {
    return `+${cleaned}`;
  }
  
  // Check if it starts with 0 (local format like 0310-2742230) - should be 11 digits total
  if (cleaned.startsWith('0')) {
    const digits = cleaned.substring(1); // Remove leading 0
    // Should be 10 digits after removing the 0
    if (digits.length === 10 && /^[0-9]{10}$/.test(digits)) {
      return `+92${digits}`;
    } else {
      throw new Error(`Invalid Pakistani phone number length: ${digits.length} digits after removing 0 (expected 10)`);
    }
  }
  
  // If it's exactly 10 digits, assume it's a Pakistani number without country code or leading 0
  if (cleaned.length === 10 && /^[0-9]{10}$/.test(cleaned)) {
    return `+92${cleaned}`;
  }
  
  // If it already has a + but not +92, return as is (might be international from another country)
  if (cleaned.startsWith('+') && !cleaned.startsWith('+92')) {
    return cleaned;
  }
  
  // If none of the above patterns match, throw an error
  throw new Error(`Unable to format phone number: ${phone}. Expected Pakistani format:\n` +
    `- 10 digits: 3102742230\n` +
    `- With leading 0: 0310-2742230\n` +
    `- With country code: +92 310 2222330 or 923102742230`);
}

/**
 * Generates SMS message text for booking confirmation
 */
function generateBookingConfirmationSMS(data: BookingConfirmationSMSData): string {
  const startTimeFormatted = `${Math.floor(data.startTime).toString().padStart(2, '0')}:${data.startTime % 1 === 0 ? '00' : '30'}`;
  const rawEndTime = data.startTime + data.duration;
  const endTime = ((rawEndTime % 24) + 24) % 24;
  const endTimeFormatted = `${Math.floor(endTime).toString().padStart(2, '0')}:${endTime % 1 === 0 ? '00' : '30'}`;
  const formattedDate = new Date(data.date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  // SMS messages have a 160 character limit for single messages
  // Keep it concise but informative
  const message = `Hi ${data.userName}, your booking at IBEX Sports Complex is confirmed!\n\n` +
    `Court: ${data.courtName}\n` +
    `Date: ${formattedDate}\n` +
    `Time: ${startTimeFormatted} - ${endTimeFormatted}\n` +
    `Total: PKR ${data.totalPrice.toFixed(2)}\n\n` +
    `Booking ID: ${data.bookingId.substring(0, 8)}\n\n` +
    `Check your email for QR codes. See you soon!`;

  return message;
}

/**
 * Sends booking confirmation SMS via AWS SNS
 * 
 * @param data - Booking information and user details
 * @returns Promise with success status and message ID or error message
 */
export async function sendBookingConfirmationSMS(
  data: BookingConfirmationSMSData
): Promise<{ success: boolean; message?: string; messageId?: string }> {
  try {
    // Validate required environment variables
    if (!process.env.AWS_REGION || !process.env.AWS_ACCESS_KEY || !process.env.AWS_SECRET_KEY) {
      console.error('AWS SNS configuration is missing. Please check your environment variables.');
      return { success: false, message: 'SMS service is not configured' };
    }

    // Validate phone number
    if (!data.userPhone || !data.userPhone.trim()) {
      console.error('Invalid phone number:', data.userPhone);
      return { success: false, message: 'Invalid phone number' };
    }

    // Format phone number to E.164 format
    const formattedPhone = formatPhoneNumber(data.userPhone.trim());

    // Generate SMS message
    const smsMessage = generateBookingConfirmationSMS(data);

    // Send SMS via SNS
    const command = new PublishCommand({
      PhoneNumber: formattedPhone,
      Message: smsMessage,
      MessageAttributes: {
        'AWS.SNS.SMS.SMSType': {
          DataType: 'String',
          StringValue: 'Transactional', // Use 'Promotional' for marketing messages
        },
      },
    });

    const response = await snsClient.send(command);

    if (response.MessageId) {
      console.log('SMS sent successfully. Message ID:', response.MessageId);
      return {
        success: true,
        message: 'SMS sent successfully',
        messageId: response.MessageId,
      };
    } else {
      console.error('SMS sending failed: No message ID returned');
      return { success: false, message: 'Failed to send SMS' };
    }
  } catch (error: unknown) {
    console.error('Error sending SMS via SNS:', error);

    // Handle specific AWS SNS errors
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorName = error instanceof Error ? error.name : 'UnknownError';
    
    if (errorName === 'InvalidParameterException') {
      return {
        success: false,
        message: `Invalid phone number format: ${errorMessage}`,
      };
    } else if (errorName === 'ThrottlingException') {
      return {
        success: false,
        message: 'SMS service is temporarily unavailable. Please try again later.',
      };
    } else if (errorName === 'AuthorizationErrorException') {
      return {
        success: false,
        message: 'SMS service authorization failed. Please check AWS credentials.',
      };
    }

    return {
      success: false,
      message: errorMessage || 'Failed to send SMS',
    };
  }
}
