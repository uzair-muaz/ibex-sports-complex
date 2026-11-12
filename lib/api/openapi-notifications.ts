/** OpenAPI pieces for Phase 13: notifications, devices and the reminder job. Merged into lib/api/openapi.ts. */

const json = (description: string, example: unknown) => ({
  description,
  content: { "application/json": { example } },
});
const err = (description: string, code: string, error: string) => ({
  description,
  content: { "application/json": { schema: { $ref: "#/components/schemas/Error" }, example: { error, code } } },
});
const auth = [{ bearerAuth: [] }, { cookieAuth: [] }];

export const notificationPaths = {
  "/api/v1/account/notifications": {
    get: {
      tags: ["Account"],
      summary: "My notifications (bell) and unreadCount",
      description:
        "Newest first. type: booking_reminder (2 h before), proof_submitted, payment_verified, proof_rejected (body has the reason), booking_cancelled, wallet_credited, points_earned, venue_news and offer (messages from the venue; no bookingId). bookingId opens the booking; amount is set for payment and wallet messages. The same messages go out as push (data: {type, bookingId}); booking received, payment verified/rejected, cancelled and the reminder are also emailed. Messages never contain bank details.",
      security: auth,
      parameters: [
        { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 50, default: 20 } },
        { name: "cursor", in: "query", schema: { type: "string" } },
      ],
      responses: {
        "200": json("Notifications", {
          items: [
            {
              id: "6650c0ffee0000000000d001",
              type: "payment_verified",
              title: "Payment verified · booking confirmed",
              body: "We received PKR 3,575 for IBX-2131. Your booking is confirmed.",
              isRead: false,
              bookingId: "6650c0ffee0000000000b201",
              amount: 3575,
              createdAt: "2026-11-02T16:00:00+05:00",
            },
          ],
          unreadCount: 1,
          nextCursor: null,
        }),
        "400": err("Bad cursor", "VALIDATION_ERROR", "Invalid cursor"),
      },
    },
  },
  "/api/v1/account/notifications/read": {
    post: {
      tags: ["Account"],
      summary: "Mark notifications as read",
      security: auth,
      requestBody: { required: true, content: { "application/json": { examples: { some: { value: { ids: ["6650c0ffee0000000000d001"] } }, all: { value: { all: true } } } } } },
      responses: { "200": json("New unread count", { unreadCount: 0 }), "400": err("Bad body", "VALIDATION_ERROR", 'Send { "ids": [...] } (up to 100) or { "all": true }.') },
    },
  },
  "/api/v1/account/devices": {
    post: {
      tags: ["Account"],
      summary: "Save this phone's push token (after sign-in and when it changes)",
      description: "If another account used this phone before, the token moves to the signed-in customer.",
      security: auth,
      requestBody: { required: true, content: { "application/json": { example: { platform: "android", pushToken: "fcm-token…" } } } },
      responses: { "200": json("Saved", { ok: true }), "400": err("Bad body", "VALIDATION_ERROR", "platform must be ios or android.") },
    },
  },
  "/api/v1/account/devices/{token}": {
    delete: {
      tags: ["Account"],
      summary: "Remove this phone's push token (on sign out)",
      security: auth,
      parameters: [{ name: "token", in: "path", required: true, schema: { type: "string" }, description: "URL-encoded push token" }],
      responses: { "200": json("Removed (or wasn't there)", { ok: true }) },
    },
  },
  "/api/v1/jobs/reminders": {
    post: {
      tags: ["Admin"],
      summary: "Scheduled job: send 2-hour match reminders (server only)",
      description:
        "Call every 10–15 minutes with `Authorization: Bearer <CRON_SECRET>` (GET also works, for Vercel Cron). Sends each reminder once, to confirmed and reserved bookings starting within 2 hours (not ones booked inside those 2 hours). It never cancels or completes bookings.",
      responses: { "200": json("Done", { checked: 4, sent: 1 }), "401": err("Wrong or missing secret", "UNAUTHORIZED", "Unauthorized") },
    },
  },
};
