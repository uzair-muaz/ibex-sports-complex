"use server";

import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

/**
 * AWS SES client configuration
 * Initialized once and reused for all email sends
 */
const sesClient = new SESClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY || "",
    secretAccessKey: process.env.AWS_SECRET_KEY || "",
  },
});

/**
 * Default sender email address from environment variable
 */
const fromEmail = process.env.SES_FROM_EMAIL || "noreply@ibexsportscomplex.com";

/**
 * Options for sending an email via AWS SES
 */
export interface SendEmailOptions {
  to: string | string[]; // Single email or array of emails
  subject: string; // Email subject line
  html: string; // HTML email content
  text?: string; // Optional plain text version
}

/**
 * Sends an email using AWS SES
 * 
 * Process:
 * 1. Validates AWS credentials and sender email are configured
 * 2. Normalizes recipient(s) to array format
 * 3. Creates SES SendEmailCommand with HTML and optional text content
 * 4. Sends email via SES client
 * 5. Returns success status with message ID or error details
 * 
 * @param options - Email sending options (to, subject, html, text)
 * @returns Result object with success status, message ID, or error
 */
export async function sendEmail(options: SendEmailOptions) {
  try {
    // Validate required environment variables are set
    if (!process.env.AWS_ACCESS_KEY || !process.env.AWS_SECRET_KEY) {
      throw new Error("AWS credentials are not configured");
    }

    if (!process.env.SES_FROM_EMAIL) {
      throw new Error("SES_FROM_EMAIL is not configured");
    }

    // Normalize recipient to array format (SES requires array)
    const toAddresses = Array.isArray(options.to) ? options.to : [options.to];

    // Build AWS SES SendEmailCommand with email content
    const command = new SendEmailCommand({
      Source: fromEmail, // Sender email address
      Destination: {
        ToAddresses: toAddresses, // Recipient email addresses
      },
      Message: {
        Subject: {
          Data: options.subject,
          Charset: "UTF-8",
        },
        Body: {
          Html: {
            Data: options.html, // HTML email body
            Charset: "UTF-8",
          },
          // Include plain text version if provided (for email clients that don't support HTML)
          ...(options.text && {
            Text: {
              Data: options.text,
              Charset: "UTF-8",
            },
          }),
        },
      },
    });

    // Send email via AWS SES
    const response = await sesClient.send(command);

    return {
      success: true,
      messageId: response.MessageId, // AWS SES message ID for tracking
    };
  } catch (error: any) {
    console.error("SES email sending error:", error);
    return {
      success: false,
      error: error.message || "Failed to send email",
    };
  }
}
