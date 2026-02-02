/**
 * Booking Confirmation Email Template
 * 
 * This template generates the HTML email content for booking confirmations.
 * It includes booking details and QR codes for entry verification and feedback.
 */

export interface AppliedDiscountEmail {
  discountId: string;
  name: string;
  type: 'percentage' | 'fixed';
  value: number;
  amountSaved: number;
}

export interface BookingEmailData {
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
  entryVerificationUrl: string;
  feedbackUrl: string;
  entryQRCode: string; // CID reference for inline attachment (e.g., "cid:entry-qr-code")
  feedbackQRCode: string; // CID reference for inline attachment (e.g., "cid:feedback-qr-code")
}

/**
 * Generates the HTML email template for booking confirmation
 */
export function generateBookingConfirmationEmail(data: BookingEmailData): string {
  const startTimeFormatted = `${Math.floor(data.startTime).toString().padStart(2, '0')}:${data.startTime % 1 === 0 ? '00' : '30'}`;
  const endTime = data.startTime + data.duration;
  const endTimeFormatted = `${Math.floor(endTime).toString().padStart(2, '0')}:${endTime % 1 === 0 ? '00' : '30'}`;
  const formattedDate = new Date(data.date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Confirmation - IBEX Sports Complex</title>
  <!-- Prevent email clients from collapsing content -->
  <style type="text/css">
    .email-wrapper { display: block !important; }
    .email-content { display: block !important; }
  </style>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #050505; color: #ffffff;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #050505;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <!-- Main Container -->
        <table role="presentation" class="email-wrapper" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #0a0a0a; border: 0.5px solid #2DD4BF; border-radius: 12px; overflow: hidden;">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #2DD4BF 0%, #14B8A6 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; font-size: 32px; font-weight: 900; color: #0F172A; letter-spacing: -0.02em;">
                IBEX SPORTS COMPLEX
              </h1>
              <p style="margin: 10px 0 0 0; font-size: 18px; color: #0F172A; font-weight: 600;">
                Booking Confirmed
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              
              <!-- Greeting -->
              <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #e4e4e7;">
                Hello <strong style="color: #2DD4BF;">${data.userName}</strong>,
              </p>
              <p style="margin: 0 0 30px 0; font-size: 16px; line-height: 1.6; color: #e4e4e7;">
                Your booking has been confirmed! We're excited to have you at IBEX Sports Complex.
              </p>

              <!-- Booking Details Card -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #18181b; border-radius: 8px; margin-bottom: 30px; overflow: hidden;">
                <tr>
                  <td style="padding: 25px;">
                    <h2 style="margin: 0 0 20px 0; font-size: 20px; font-weight: 700; color: #ffffff; border-bottom: 2px solid #2DD4BF; padding-bottom: 10px;">
                      Booking Details
                    </h2>
                    
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 8px 0; color: #a1a1aa; font-size: 14px;">Court:</td>
                        <td style="padding: 8px 0; color: #ffffff; font-size: 14px; font-weight: 600; text-align: right;">${data.courtName}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #a1a1aa; font-size: 14px;">Date:</td>
                        <td style="padding: 8px 0; color: #ffffff; font-size: 14px; font-weight: 600; text-align: right;">${formattedDate}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #a1a1aa; font-size: 14px;">Time:</td>
                        <td style="padding: 8px 0; color: #ffffff; font-size: 14px; font-weight: 600; text-align: right;">${startTimeFormatted} - ${endTimeFormatted}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #a1a1aa; font-size: 14px;">Duration:</td>
                        <td style="padding: 8px 0; color: #ffffff; font-size: 14px; font-weight: 600; text-align: right;">${data.duration} hour${data.duration !== 1 ? 's' : ''}</td>
                      </tr>
                      ${data.discountAmount && data.discountAmount > 0 ? `
                      <tr>
                        <td colspan="2" style="padding: 8px 0; border-top: 1px solid #3f3f46;"></td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #a1a1aa; font-size: 14px;">Subtotal:</td>
                        <td style="padding: 8px 0; color: #ffffff; font-size: 14px; font-weight: 600; text-align: right;">PKR ${(data.originalPrice || data.totalPrice + data.discountAmount).toLocaleString()}</td>
                      </tr>
                      ${(data.discounts || []).map(d => `
                      <tr>
                        <td style="padding: 4px 0; color: #4ade80; font-size: 13px;">${d.name} (${d.type === 'percentage' ? d.value + '%' : 'PKR ' + d.value})</td>
                        <td style="padding: 4px 0; color: #4ade80; font-size: 13px; text-align: right;">-PKR ${d.amountSaved.toLocaleString()}</td>
                      </tr>
                      `).join('')}
                      <tr>
                        <td colspan="2" style="padding: 8px 0; border-top: 1px solid #3f3f46;"></td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #a1a1aa; font-size: 14px;">Total:</td>
                        <td style="padding: 8px 0; color: #2DD4BF; font-size: 16px; font-weight: 700; text-align: right;">PKR ${data.totalPrice.toLocaleString()}</td>
                      </tr>
                      <tr>
                        <td colspan="2">
                          <div style="background-color: rgba(74, 222, 128, 0.1); border: 1px solid rgba(74, 222, 128, 0.3); border-radius: 4px; padding: 8px; margin-top: 8px; text-align: center;">
                            <span style="color: #4ade80; font-size: 13px; font-weight: 600;">🎉 You saved PKR ${data.discountAmount.toLocaleString()}!</span>
                          </div>
                        </td>
                      </tr>
                      ` : `
                      <tr>
                        <td style="padding: 8px 0; color: #a1a1aa; font-size: 14px;">Total Price:</td>
                        <td style="padding: 8px 0; color: #2DD4BF; font-size: 16px; font-weight: 700; text-align: right;">PKR ${data.totalPrice.toLocaleString()}</td>
                      </tr>
                      `}
                    </table>
                  </td>
                </tr>
              </table>

              <!-- QR Codes Section -->
              <h2 style="margin: 0 0 20px 0; font-size: 20px; font-weight: 700; color: #ffffff;">
                Your QR Codes
              </h2>
              <p style="margin: 0 0 30px 0; font-size: 14px; line-height: 1.6; color: #a1a1aa;">
                Please save these QR codes. You'll need the Entry Verification QR code when you arrive at the venue, and the Feedback QR code to share your experience after your booking.
              </p>

              <!-- QR Codes Grid -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
                <tr>
                  <!-- Entry Verification QR Code -->
                  <td style="width: 50%; padding-right: 10px; vertical-align: top;">
                    <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #18181b; border-radius: 8px; padding: 20px; text-align: center;">
                      <tr>
                        <td>
                          <h3 style="margin: 0 0 15px 0; font-size: 14px; font-weight: 600; color: #2DD4BF; text-transform: uppercase; letter-spacing: 0.05em;">
                            Entry Verification
                          </h3>
                          <div style="display: inline-block; background-color: #ffffff; padding: 15px; border-radius: 8px;">
                            <img src="${data.entryQRCode}" alt="Entry Verification QR Code" style="width: 180px; height: 180px; display: block; margin: 0 auto; border: 0;" />
                          </div>
                          <p style="margin: 15px 0 0 0; font-size: 12px; color: #a1a1aa; line-height: 1.4;">
                            Show this QR code at the entrance
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                  
                  <!-- Feedback QR Code -->
                  <td style="width: 50%; padding-left: 10px; vertical-align: top;">
                    <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #18181b; border-radius: 8px; padding: 20px; text-align: center;">
                      <tr>
                        <td>
                          <h3 style="margin: 0 0 15px 0; font-size: 14px; font-weight: 600; color: #2DD4BF; text-transform: uppercase; letter-spacing: 0.05em;">
                            Feedback
                          </h3>
                          <div style="display: inline-block; background-color: #ffffff; padding: 15px; border-radius: 8px;">
                            <img src="${data.feedbackQRCode}" alt="Feedback QR Code" style="width: 180px; height: 180px; display: block; margin: 0 auto; border: 0;" />
                          </div>
                          <p style="margin: 15px 0 0 0; font-size: 12px; color: #a1a1aa; line-height: 1.4;">
                            Scan after your session to share feedback
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Important Information -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #18181b; border-left: 4px solid #2DD4BF; border-radius: 8px; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #e4e4e7;">
                      <strong style="color: #2DD4BF;">Important:</strong> Please arrive 10 minutes before your scheduled time. The Entry Verification QR code must be presented at the entrance.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Footer -->
              <p style="margin: 30px 0 0 0; font-size: 14px; line-height: 1.6; color: #a1a1aa; text-align: center;">
                If you have any questions, please contact us at 
                <a href="mailto:ibexsportscomplex@gmail.com" style="color: #2DD4BF; text-decoration: none;">ibexsportscomplex@gmail.com</a>
                or call <a href="tel:+923255429429" style="color: #2DD4BF; text-decoration: none;">+92 325 5429429</a>
              </p>
              <p style="margin: 20px 0 0 0; font-size: 12px; line-height: 1.6; color: #71717a; text-align: center;">
                © ${new Date().getFullYear()} IBEX Sports Complex. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
