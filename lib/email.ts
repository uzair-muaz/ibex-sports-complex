// Email functionality is currently disabled
// import { Resend } from 'resend';

// if (!process.env.RESEND_API_KEY) {
//   throw new Error('Please add your RESEND_API_KEY to .env.local');
// }

// const resend = new Resend(process.env.RESEND_API_KEY);
// const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@ibexarena.com';

export interface BookingConfirmationEmailData {
  userName: string;
  userEmail: string;
  courtName: string;
  date: string;
  startTime: number;
  duration: number;
  totalPrice: number;
}

// Email functionality is currently disabled
export async function sendBookingConfirmationEmail(data: BookingConfirmationEmailData) {
  // Email sending is disabled
  return { success: false, message: 'Email functionality is disabled' };
  
  /* Commented out email sending code:
  try {
    const startTimeFormatted = `${data.startTime.toString().padStart(2, '0')}:00`;
    const endTime = data.startTime + data.duration;
    const endTimeFormatted = `${endTime.toString().padStart(2, '0')}:${(data.duration % 1 === 0.5 ? '30' : '00')}`;

    const { data: emailData, error } = await resend.emails.send({
      from: fromEmail,
      to: data.userEmail,
      subject: `Booking Confirmed - IBEX Sports Arena`,
      html: `...`,
    });

    if (error) {
      console.error('Resend error:', error);
      throw error;
    }

    return { success: true, emailId: emailData?.id };
  } catch (error: any) {
    console.error('Email sending error:', error);
    throw error;
  }
  */
}

