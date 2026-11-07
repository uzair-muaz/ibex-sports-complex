/** OpenAPI pieces for Phase 14: preferences and FAQs. Merged into lib/api/openapi.ts. */

const json = (description: string, example: unknown) => ({
  description,
  content: { "application/json": { example } },
});
const err = (description: string, code: string, error: string) => ({
  description,
  content: { "application/json": { schema: { $ref: "#/components/schemas/Error" }, example: { error, code } } },
});
const auth = [{ bearerAuth: [] }, { cookieAuth: [] }];

const example = {
  primarySport: "PADEL",
  skillLevel: "intermediate",
  hand: "right",
  courtSide: "left",
  notifications: { matchReminders: true, paymentUpdates: true, courtAvailability: false, newsletter: false },
};

export const preferencesPaths = {
  "/api/v1/account/preferences": {
    get: {
      tags: ["Account"],
      summary: "My preferences",
      description:
        "New accounts: primarySport, skillLevel, hand and courtSide are null; notifications are matchReminders on, paymentUpdates on, courtAvailability off, newsletter off. primarySport: PADEL, PICKLEBALL, FUTSAL or CRICKET. skillLevel: beginner, intermediate, advanced or pro. hand: right, left or ambidextrous. courtSide: left, right or either.",
      security: auth,
      responses: { "200": json("Preferences", example) },
    },
    put: {
      tags: ["Account"],
      summary: "Save preferences (only the fields sent change)",
      description:
        "Send any of the fields; null clears a choice. Returns the full set. The switches stop push and email only (the in-app list keeps everything): matchReminders → the 2-hour reminder; paymentUpdates → payment screenshot received/verified/rejected, wallet credited, points earned. Cancellations and the booking-received email are always sent. courtAvailability and newsletter are saved but nothing is sent for them yet. PATCH works the same.",
      security: auth,
      requestBody: { required: true, content: { "application/json": { example: { skillLevel: "advanced", notifications: { matchReminders: false } } } } },
      responses: {
        "200": json("Saved preferences", { ...example, skillLevel: "advanced", notifications: { ...example.notifications, matchReminders: false } }),
        "400": err("Wrong value", "VALIDATION_ERROR", "skillLevel must be one of: beginner, intermediate, advanced, pro."),
      },
    },
  },
  "/api/v1/content/faqs": {
    get: {
      tags: ["Venue"],
      summary: "Support FAQs (public)",
      description:
        "Written by the super admin in App Settings. Until they do, built-in FAQs are made from the current rules (advance %, points, cancellation notice). Cached for 5 minutes.",
      responses: {
        "200": json("FAQs", {
          items: [{ question: "How do I pay for a booking?", answer: "Your booking is reserved straight away. Send at least 50% as an advance…" }],
        }),
      },
    },
  },
};
