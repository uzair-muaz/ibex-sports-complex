'use server';

import QRCode from 'qrcode';

/**
 * Generates a QR code as a base64 data URL for embedding directly in HTML emails
 * 
 * Process:
 * 1. Takes the data string (URL) to encode
 * 2. Generates QR code image using qrcode library
 * 3. Converts to base64 data URL format (data:image/png;base64,...)
 * 4. Returns data URL that can be used directly in <img src=""> tags
 * 
 * @param data - String to encode in QR code (typically a URL)
 * @param options - Optional QR code styling options
 * @returns Base64 data URL string (e.g., "data:image/png;base64,iVBORw0KG...")
 */
export async function generateQRCodeBase64(
  data: string,
  options?: {
    size?: number; // QR code width/height in pixels
    margin?: number; // White space margin around QR code
    color?: {
      dark?: string; // QR code pattern color
      light?: string; // Background color
    };
  }
): Promise<string> {
  try {
    const {
      size = 200,
      margin = 2,
      color = {
        dark: '#0F172A', // Dark color matching website design
        light: '#FFFFFF', // White background for contrast
      },
    } = options || {};

    // Generate QR code and convert to base64 data URL
    const dataUrl = await QRCode.toDataURL(data, {
      width: size,
      margin,
      color: {
        dark: color.dark,
        light: color.light,
      },
      errorCorrectionLevel: 'M', // Medium error correction (good balance of size and reliability)
    });

    return dataUrl;
  } catch (error: any) {
    console.error('QR code generation error:', error);
    throw new Error(`Failed to generate QR code: ${error.message}`);
  }
}

/**
 * Generates both QR codes needed for a booking confirmation email
 * 
 * Creates two QR codes:
 * 1. Entry Verification QR: Links to /booking/verify/{bookingId} - scanned at venue entry
 * 2. Feedback QR: Links to /feedback/{bookingId} - used after session for feedback
 * 
 * Both QR codes are generated in parallel for better performance
 * 
 * @param bookingId - MongoDB booking ObjectId
 * @param baseUrl - Base URL of the application (e.g., https://ibexarena.com)
 * @returns Object containing both QR codes as base64 data URLs
 */
export async function generateBookingQRCodes(bookingId: string, baseUrl: string) {
  // Build full URLs for each QR code
  const entryVerificationUrl = `${baseUrl}/booking/verify/${bookingId}`;
  const feedbackUrl = `${baseUrl}/feedback/${bookingId}`;

  // Generate both QR codes in parallel for better performance
  const [entryQR, feedbackQR] = await Promise.all([
    generateQRCodeBase64(entryVerificationUrl, {
      size: 200,
      color: {
        dark: '#0F172A',
        light: '#FFFFFF',
      },
    }),
    generateQRCodeBase64(feedbackUrl, {
      size: 200,
      color: {
        dark: '#0F172A',
        light: '#FFFFFF',
      },
    }),
  ]);

  return {
    entryVerification: entryQR, // Base64 data URL for entry verification QR
    feedback: feedbackQR, // Base64 data URL for feedback QR
  };
}
