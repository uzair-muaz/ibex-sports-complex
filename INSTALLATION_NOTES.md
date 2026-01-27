# Installation Notes

## Required NPM Packages

After pulling these changes, you need to install the following packages:

```bash
npm install @aws-sdk/client-ses @aws-sdk/client-sns qrcode @types/qrcode
```

### Package Details:

1. **@aws-sdk/client-ses** - AWS SDK for sending emails via Amazon SES
2. **@aws-sdk/client-sns** - AWS SDK for sending SMS via Amazon SNS
3. **qrcode** - Server-side QR code generation for email templates
4. **@types/qrcode** - TypeScript types for qrcode package

## Environment Variables

Make sure you have the following environment variables set in your `.env.local`:

```env
# AWS SES Configuration
AWS_REGION=us-east-1  # or your preferred AWS region
AWS_ACCESS_KEY=your_aws_access_key
AWS_SECRET_KEY=your_aws_secret_key
SES_FROM_EMAIL=noreply@yourdomain.com  # Must be verified in AWS SES
```

## AWS SES Setup

1. **Verify your email address or domain** in AWS SES
2. **Get your AWS credentials** (Access Key ID and Secret Access Key)
3. **Set the appropriate region** where your SES is configured
4. **Update environment variables** with your credentials

## AWS SNS Setup

1. **Configure SMS settings** in AWS SNS Console:
   - Go to AWS SNS Console → Text messaging (SMS)
   - Set up your default SMS type (Transactional or Promotional)
   - Configure spending limits if needed
   - Request production access if you're in sandbox mode

2. **Phone Number Format**:
   - SMS will be sent to the phone number provided during booking
   - Phone numbers are automatically formatted to E.164 format (e.g., +1234567890)
   - Make sure phone numbers include country code
   - You may need to adjust the `formatPhoneNumber` function in `lib/sms.ts` based on your country's phone number format

3. **Note**: The same AWS credentials (AWS_ACCESS_KEY and AWS_SECRET_KEY) are used for both SES and SNS

## Optional: Remove Resend Package

If you're no longer using Resend, you can remove it:

```bash
npm uninstall resend
```

Note: The old Resend code has been removed from `lib/email.ts` and replaced with AWS SES implementation.
