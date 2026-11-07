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
