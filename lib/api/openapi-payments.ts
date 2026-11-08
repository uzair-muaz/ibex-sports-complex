/** OpenAPI pieces for Phase 7: bank transfer and payment proofs. Merged into lib/api/openapi.ts. */

const json = (description: string, example: unknown) => ({
  description,
  content: { "application/json": { example } },
});
const err = (description: string, code: string, error: string) => ({
  description,
  content: { "application/json": { schema: { $ref: "#/components/schemas/Error" }, example: { error, code } } },
});

const proofExample = {
  id: "6650c0ffee0000000000f031",
  amount: 3600,
  status: "submitted",
  source: "app",
  submittedAt: "2026-11-02T15:10:00+05:00",
  imageUrl: "https://staging.ibexsportscomplex.com/api/v1/payment-proofs/6650c0ffee0000000000f031/file?exp=1794061847&sig=…",
  fileType: "jpg",
  transferReference: "TRX-99812",
  transferredAt: "2026-11-02T15:00:00+05:00",
  verifiedAmount: null,
  rejectionReason: null,
};

const idParam = { name: "id", in: "path", required: true, schema: { type: "string" } };

export const paymentPaths = {
  "/api/v1/account/bookings/{id}/cancellation": {
    get: {
      tags: ["Account"],
      summary: "Can I cancel, and what do I get back? (nothing changes)",
      description:
        "refundAmount = money already paid (verified transfer or cash) plus wallet credit used; it goes to the IBEX wallet. Points and membership hours used always come back. Customers can cancel until cancellationNoticeMinutes before the start (Admin → App Settings; 240 today).",
      security: [{ bearerAuth: [] }, { cookieAuth: [] }],
      parameters: [idParam],
      responses: {
        "200": json("Preview", {
          canCancel: true,
          cancelUntil: "2026-11-05T14:00:00+05:00",
          refundAmount: 3575,
          refundTo: "wallet",
          pointsReturned: 1850,
          hoursReturned: 0,
        }),
        "404": err("Not yours / not found", "BOOKING_NOT_FOUND", "Booking not found"),
      },
    },
  },
  "/api/v1/account/bookings/{id}/cancel": {
    post: {
      tags: ["Account"],
      summary: "Cancel my booking (app). Body {reason, note?}",
      description: [
        "reason: weather, teammate_unavailable, schedule_conflict or other. note: optional, up to 300 characters.",
        "Answer: `{booking}` with status cancelled and `refund: {amount, to: \"wallet\"}` (null when nothing was paid). A double tap can never refund twice.",
        "If a transfer screenshot is verified after the cancel, that money also goes to the wallet.",
        "Errors: 400 VALIDATION_ERROR; 404 BOOKING_NOT_FOUND; 409 ALREADY_CANCELLED, NOT_CANCELLABLE; 422 CANCEL_WINDOW_PASSED, ALREADY_STARTED.",
        "The website keeps using DELETE /account/bookings/{id} (unchanged).",
      ].join("\n"),
      security: [{ bearerAuth: [] }, { cookieAuth: [] }],
      parameters: [idParam],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["reason"],
              properties: {
                reason: { type: "string", enum: ["weather", "teammate_unavailable", "schedule_conflict", "other"] },
                note: { type: "string", maxLength: 300 },
              },
            },
            example: { reason: "weather", note: "Rain forecast" },
          },
        },
      },
      responses: {
        "200": json("Cancelled", { booking: { id: "…", status: "cancelled", refund: { amount: 3575, to: "wallet" } } }),
        "422": err("Too late", "CANCEL_WINDOW_PASSED", "It's too late to cancel in the app. Please contact the venue."),
      },
    },
  },
  "/api/v1/bookings/guest": {
    get: {
      tags: ["Bookings"],
      summary: "Guest: bookings made on this phone",
      description: [
        "Send the saved guest codes in a header: `X-Guest-Tokens: gt_…,gt_…` (up to 50; never put them in the address). Unknown codes are ignored.",
        "Answer: `{items: [Booking]}` — upcoming first (soonest first), then past (newest first). Same booking object as everywhere else; guests can't cancel in the app.",
        "When the guest signs in with the same email (Google/Apple, or POST /account/claim-bookings), the booking moves to their account and the code stops working here.",
      ].join("\n"),
      parameters: [{ name: "X-Guest-Tokens", in: "header", required: false, schema: { type: "string" } }],
      responses: { "200": json("Guest bookings", { items: [] }) },
    },
  },
  "/api/v1/bookings/guest/{id}": {
    get: {
      tags: ["Bookings"],
      summary: "Guest: one booking (needs its code in X-Guest-Tokens or X-Guest-Token)",
      parameters: [idParam, { name: "X-Guest-Tokens", in: "header", required: false, schema: { type: "string" } }],
      responses: {
        "200": json("Booking", { booking: { id: "…", reference: "IBX-2109", status: "reserved" } }),
        "404": err("Not found or not your code", "BOOKING_NOT_FOUND", "Booking not found"),
      },
    },
  },
  "/api/v1/payments/instructions": {
    get: {
      tags: ["Payments"],
      summary: "How to pay the advance by bank transfer",
      description:
        "Edited by the super admin in Admin → App Settings → Payments. bankAccounts is empty until they add one (the app should then show the WhatsApp number).",
      responses: {
        "200": json("Instructions", {
          minAdvancePercent: 50,
          bankAccounts: [{ bankName: "Meezan Bank", accountTitle: "IBEX Sports Complex", accountNumber: "0123456789", iban: "PK00MEZN0000000123456789" }],
          whatsAppNumber: "+923255429429",
          acceptedFileTypes: ["jpg", "png", "pdf"],
          maxFileSizeMb: 5,
          transferNote: "Write your booking reference in the transfer description.",
          verificationNote: "Our team checks payments by hand. You will get a notification.",
          balanceNote: "Pay the remaining balance at the venue.",
        }),
      },
    },
  },
  "/api/v1/bookings/{id}/payment-proofs": {
    get: {
      tags: ["Payments"],
      summary: "List the transfer screenshots for a booking",
      description: "Signed-in owner (Bearer) or guest with header `X-Guest-Token: gt_…`. Oldest first.",
      security: [{ bearerAuth: [] }, {}],
      parameters: [idParam, { name: "X-Guest-Token", in: "header", required: false, schema: { type: "string" } }],
      responses: {
        "200": json("Proofs", { proofs: [proofExample] }),
        "404": err("Not your booking / not found", "BOOKING_NOT_FOUND", "Booking not found"),
      },
    },
    post: {
      tags: ["Payments"],
      summary: "Send a transfer screenshot (multipart/form-data)",
      description: [
        "Fields: `file` (JPG, PNG or PDF, max 5 MB — checked by content, not name), `amount` (PKR sent), `transferReference?`, `transferredAt?` (ISO).",
        "Answer 201: `{proof, booking}` (booking in the app shape; payment.status becomes proof_submitted).",
        "An amount below the advance is still accepted; staff decide. Verified amounts add up, and the booking becomes confirmed when they reach advanceRequired.",
        "`imageUrl` is a private link that works for 1 hour; fetch the booking or the list again for a fresh one.",
        "Errors: 400 INVALID_FILE, VALIDATION_ERROR; 404 BOOKING_NOT_FOUND; 409 BOOKING_CANCELLED, TOO_MANY_PROOFS (10 per booking); 503 STORAGE_NOT_CONFIGURED (uploads not set up on this server yet — tell the customer to use WhatsApp).",
      ].join("\n"),
      security: [{ bearerAuth: [] }, {}],
      parameters: [idParam, { name: "X-Guest-Token", in: "header", required: false, schema: { type: "string" } }],
      requestBody: {
        required: true,
        content: {
          "multipart/form-data": {
            schema: {
              type: "object",
              required: ["file", "amount"],
              properties: {
                file: { type: "string", format: "binary" },
                amount: { type: "integer", example: 3600 },
                transferReference: { type: "string", example: "TRX-99812" },
                transferredAt: { type: "string", format: "date-time" },
              },
            },
          },
        },
      },
      responses: {
        "201": json("Saved", { proof: proofExample, booking: { id: "…", payment: { status: "proof_submitted" } } }),
        "400": err("Wrong file", "INVALID_FILE", "Only JPG, PNG or PDF files are accepted."),
        "409": err("Cancelled booking", "BOOKING_CANCELLED", "This booking is cancelled."),
        "503": err("No storage on this server", "STORAGE_NOT_CONFIGURED", "Uploads are not available yet. Please send the screenshot on WhatsApp."),
      },
    },
  },
  "/api/v1/payment-proofs/{id}/file": {
    get: {
      tags: ["Payments"],
      summary: "The screenshot file (signed link only)",
      description: "Use the imageUrl exactly as given. 403 LINK_INVALID when expired or changed.",
      parameters: [idParam],
      responses: { "200": { description: "The file (image/jpeg, image/png or application/pdf)" }, "403": err("Bad link", "LINK_INVALID", "Link expired or not valid") },
    },
  },
  "/api/v1/admin/payment-proofs": {
    get: {
      tags: ["Admin"],
      summary: "Staff: payment screenshots (?status=submitted|verified|rejected)",
      security: [{ cookieAuth: [] }, { bearerAuth: [] }],
      responses: { "200": json("Proofs with booking summary", { proofs: [] }) },
    },
    post: {
      tags: ["Admin"],
      summary: "Staff: add a payment received on WhatsApp (saved as verified)",
      description: "multipart/form-data: bookingReference (IBX-2109), amount, file? (JPG/PNG/PDF), note?",
      security: [{ cookieAuth: [] }, { bearerAuth: [] }],
      responses: { "201": json("Added", { success: true, bookingId: "…" }), "404": err("No such booking", "BOOKING_NOT_FOUND", "No booking IBX-9999.") },
    },
  },
  "/api/v1/admin/payment-proofs/{id}/verify": {
    post: {
      tags: ["Admin"],
      summary: "Staff: verify a screenshot. Body {amount} = PKR that actually arrived",
      security: [{ cookieAuth: [] }, { bearerAuth: [] }],
      parameters: [idParam],
      responses: { "200": json("Verified", { success: true }), "409": err("Already checked", "PROOF_ALREADY_REVIEWED", "This proof was already checked.") },
    },
  },
  "/api/v1/admin/payment-proofs/{id}/reject": {
    post: {
      tags: ["Admin"],
      summary: "Staff: reject a screenshot. Body {reason} (shown to the customer)",
      security: [{ cookieAuth: [] }, { bearerAuth: [] }],
      parameters: [idParam],
      responses: { "200": json("Rejected", { success: true }), "409": err("Already checked", "PROOF_ALREADY_REVIEWED", "This proof was already checked.") },
    },
  },
};
