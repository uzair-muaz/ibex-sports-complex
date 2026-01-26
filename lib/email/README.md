# Email System Documentation

This directory contains the modular email system for IBEX Sports Arena, using AWS SES for email delivery.

## Structure

```
lib/email/
├── index.ts              # Main email functions (public API)
├── ses.ts               # AWS SES client configuration
├── qrcode.ts            # QR code generation utilities
├── template-renderer.ts  # Template loading and rendering
├── templates/           # Email HTML templates
│   └── booking-confirmation.html
└── README.md           # This file
```

## Environment Variables

Make sure you have the following environment variables set in your `.env.local`:

```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY=your-access-key
AWS_SECRET_KEY=your-secret-key
SES_FROM_EMAIL=noreply@yourdomain.com
```

## Usage

### Sending Booking Confirmation Email

```typescript
import { sendBookingConfirmationEmail } from '@/lib/email';

await sendBookingConfirmationEmail({
  userName: 'John Doe',
  userEmail: 'john@example.com',
  courtName: 'Padel Court 1',
  date: '2024-01-15',
  startTime: 14,
  duration: 2,
  totalPrice: 10000,
  bookingId: '507f1f77bcf86cd799439011',
  amountPaid: 0,
});
```

## Creating New Email Templates

1. Create a new HTML file in `templates/` directory
2. Use `{{variableName}}` syntax for template variables
3. Use the same design language:
   - Background: `#050505` (dark)
   - Container: `#0F172A` (darker)
   - Cards: `#1E293B` (medium dark)
   - Primary color: `#2DD4BF` (teal/cyan)
   - Text: `#FFFFFF` (white) / `#CBD5E1` (light gray)
   - Borders: `#334155` (gray)

4. Add a render function in `index.ts`:

```typescript
export async function sendYourNewEmail(data: YourEmailData) {
  const templateVariables = {
    // Map your data to template variables
  };
  
  const htmlContent = await renderEmailTemplate(
    'your-template.html',
    templateVariables
  );
  
  return await sendEmail({
    to: data.email,
    subject: 'Your Subject',
    html: htmlContent,
  });
}
```

## Template Variables

Templates use `{{variableName}}` syntax. All variables are automatically escaped for HTML safety.

Example:
```html
<h1>Hello {{userName}}</h1>
<p>Your booking is on {{date}}</p>
```

## QR Code Generation

QR codes are automatically generated as base64 data URLs and embedded directly in the email. The system generates:
- Entry Verification QR Code: Links to `/booking/verify/{bookingId}`
- Feedback QR Code: Links to `/feedback/{bookingId}`

## Design Guidelines

- **Color Scheme**: Dark theme with teal accents matching the main website
- **Typography**: System fonts (-apple-system, BlinkMacSystemFont, etc.)
- **Responsive**: Tables-based layout for email client compatibility
- **Accessibility**: Proper alt text for images, semantic HTML

## Error Handling

Email sending failures are logged but don't break the main application flow. This ensures that booking creation succeeds even if email delivery fails.

## Testing

To test email functionality:

1. Ensure AWS SES is properly configured
2. Verify your sending domain/email in AWS SES
3. Test with a verified email address
4. Check server logs for any errors

## AWS SES Setup

1. Verify your sending domain or email address in AWS SES
2. Request production access if needed (SES starts in sandbox mode)
3. Configure IAM user with SES permissions
4. Add credentials to environment variables
