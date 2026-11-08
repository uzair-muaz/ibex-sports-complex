const sec = [{ bearerAuth: [] }, { cookieAuth: [] }];

/** Staff tools for a customer's membership hours bank. */
export const membershipAdminPaths = {
  "/api/v1/admin/customers/{id}": {
    get: {
      tags: ["Admin"],
      summary: "Staff: one customer on one page",
      description:
        "Answer: `{customer, stats, bookings, wallet, points, membership, tickets}`. stats: total, upcoming, completed, cancelled, paidTotal (kept for bookings not cancelled), dueTotal (still owed). bookings include guest bookings made with the same email before sign-up (`guest: true`). Staff accounts give 404.",
      security: sec,
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      responses: {
        "200": { description: "OK" },
        "404": { description: "No such customer (USER_NOT_FOUND)" },
      },
    },
  },
  "/api/v1/admin/memberships": {
    get: {
      tags: ["Admin"],
      summary: "Staff: a customer's memberships and hours history (?userId=)",
      description: [
        "memberships: newest first, with hours per sport (total / used / remaining), what was paid and who activated it.",
        "history: newest first. type: activated, carried_over, added, removed, used, returned, extended, cancelled. hours is signed (+ into the bank, − out).",
        "used / returned come from bookings paid with hours; the rest are staff changes.",
      ].join("\n"),
      security: sec,
      parameters: [{ name: "userId", in: "query", required: true, schema: { type: "string" } }],
      responses: {
        "200": {
          description: "OK",
          content: {
            "application/json": {
              example: {
                memberships: [
                  {
                    id: "6650c0ffee0000000000m001",
                    planName: "Gold",
                    status: "active",
                    validFrom: "2026-11-01T10:00:00+05:00",
                    validUntil: "2026-12-01T10:00:00+05:00",
                    hoursBySport: [{ sport: "PADEL", total: 12, used: 3, remaining: 9 }],
                    pricePaid: 25000,
                    paymentMethod: "cash",
                    paymentNote: "",
                    activatedBy: "Front desk",
                    cancelledAt: null,
                  },
                ],
                history: [
                  { id: "used:6650c0ffee0000000000b001", type: "used", sport: "PADEL", hours: -1.5, remainingAfter: null, validUntil: null, note: "Booking 2026-11-05 at 19:00", by: null, bookingId: "6650c0ffee0000000000b001", bookingRef: "IBX-8821", date: "2026-11-04T12:00:00+05:00" },
                  { id: "6650c0ffee0000000000h002", type: "added", sport: "PADEL", hours: 2, remainingAfter: 10.5, validUntil: null, note: "Court closed for rain on Sunday", by: "Super Admin", bookingId: null, bookingRef: null, date: "2026-11-03T18:00:00+05:00" },
                ],
              },
            },
          },
        },
        "404": { description: "No such customer (USER_NOT_FOUND)" },
      },
    },
  },
  "/api/v1/admin/memberships/{id}": {
    post: {
      tags: ["Admin"],
      summary: "Super admin: add or remove hours, change the end date, or cancel a membership",
      description: [
        "- `adjust-hours`: `{action, sport, hours, note, requestId}`. hours + adds, − removes; whole or half hours. Only on an active membership. Can't remove more than is left (409 NOT_ENOUGH_HOURS). `requestId` once per open form; repeats get 409 DUPLICATE. Answer: `{remaining}`.",
        "- `change-end-date`: `{action, validUntil, note}`. Any future date; an ended plan becomes active again unless another plan is active. Answer: `{validUntil}`.",
        "- `cancel`: `{action, note}`. Stops it now; hours left can't be used; bookings already made stay.",
        "A reason (note, 3–300 characters) is always required and shown in the history. Staff who aren't super admin get 403.",
      ].join("\n"),
      security: sec,
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            example: { action: "adjust-hours", sport: "PADEL", hours: 2, note: "Court closed for rain on Sunday", requestId: "3f1c9b2e-8a4d-4f0e-9c6b-1d2e3f4a5b6c" },
          },
        },
      },
      responses: {
        "200": { description: "Saved" },
        "400": { description: "VALIDATION_ERROR" },
        "403": { description: "Super admin only" },
        "404": { description: "Membership not found" },
        "409": { description: "MEMBERSHIP_NOT_ACTIVE, NOT_ENOUGH_HOURS, DUPLICATE, MEMBERSHIP_CANCELLED or OTHER_PLAN_ACTIVE" },
      },
    },
  },
} as const;
