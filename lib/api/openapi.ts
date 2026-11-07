import { authPaths, authSchemas } from "@/lib/api/openapi-auth";
import { catalogPaths } from "@/lib/api/openapi-catalog";

/**
 * OpenAPI 3.0 document for the public HTTP API (`/api/v1`).
 * Served at GET /api/v1/openapi — UI at /docs.
 */
export function getOpenApiDocument(baseUrl?: string) {
  const serverUrl = baseUrl || process.env.APP_URL || "http://localhost:3000";

  return {
    openapi: "3.0.3",
    info: {
      title: "IBEX Sports Complex API",
      version: "1.0.0",
      description: [
        "HTTP API for the Next.js web app and the Flutter mobile app.",
        "",
        "## Surface",
        "All product endpoints are under `/api/v1/**`. Do not use legacy paths outside v1.",
        "Exception: NextAuth session routes remain at `/api/auth/*` (Auth.js convention).",
        "`/api/bff/*` rewrites to `/api/v1/*` for backward compatibility only.",
        "",
        "## Authentication",
        "- **Web**: NextAuth session cookie (`credentials: include`).",
        "- **Flutter / mobile**: `POST /api/v1/auth/google`, `/auth/apple`, `/auth/login` or `/auth/register` → `Authorization: Bearer <accessToken>`. Renew with `POST /api/v1/auth/refresh`.",
        "",
        "## Errors",
        "Errors look like `{ \"error\": \"message for people\", \"code\": \"CODE_FOR_THE_APP\" }`. Times are ISO with +05:00.",
        "",
        "Customer routes reject admin roles (403). Admin routes reject customers (401).",
        "Never pass raw user IDs from the client for ownership — identity comes from cookie or Bearer.",
        "",
        "## CORS",
        "Configure allowed origins with `API_CORS_ORIGINS` (comma-separated). Unlisted Origins do not receive `Access-Control-Allow-Origin`. All `/api/v1` routes support `OPTIONS`.",
      ].join("\n"),
    },
    servers: [{ url: serverUrl, description: "API host" }],
    tags: [
      { name: "Auth", description: "Mobile Google sign-in and session probe" },
      { name: "Venue", description: "Venue, sports, booking policy and courts (public)" },
      { name: "Bookings", description: "Public booking create" },
      { name: "Account", description: "Customer profile, bookings, loyalty, membership, support" },
      { name: "Admin", description: "Staff-only operations" },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Access token from any /api/v1/auth sign-in address",
        },
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "authjs.session-token",
          description:
            "NextAuth session cookie (name may be `__Secure-authjs.session-token` in production)",
        },
      },
      schemas: {
        Error: {
          type: "object",
          properties: {
            error: { type: "string" },
            code: { type: "string", example: "WRONG_PASSWORD" },
          },
          required: ["error"],
        },
        ...authSchemas,
        ApiUser: {
          type: "object",
          properties: {
            id: { type: "string" },
            email: { type: "string", nullable: true },
            name: { type: "string", nullable: true },
            role: {
              type: "string",
              enum: ["user", "admin", "super_admin"],
            },
            phone: { type: "string" },
            image: { type: "string", nullable: true },
          },
        },
        CreateBookingInput: {
          type: "object",
          required: [
            "courtType",
            "date",
            "startTime",
            "duration",
            "userName",
            "userEmail",
            "userPhone",
          ],
          properties: {
            courtType: {
              type: "string",
              enum: ["PADEL", "CRICKET", "PICKLEBALL", "FUTSAL"],
            },
            date: { type: "string", example: "2026-08-15", description: "YYYY-MM-DD" },
            startTime: { type: "number", example: 18, description: "Hour of day (e.g. 18.5 = 6:30 PM)" },
            duration: { type: "number", example: 1.5 },
            userName: { type: "string" },
            userEmail: { type: "string", format: "email" },
            userPhone: { type: "string" },
            loyaltyPointsToRedeem: { type: "number" },
            useMembershipHours: { type: "boolean" },
            useGuestPass: { type: "boolean" },
          },
        },
      },
    },
    paths: {
      "/api/v1/auth/me": {
        get: {
          tags: ["Auth"],
          summary: "Current authenticated user",
          security: [{ bearerAuth: [] }, { cookieAuth: [] }],
          responses: {
            "200": {
              description: "OK",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      user: { $ref: "#/components/schemas/ApiUser" },
                    },
                  },
                },
              },
            },
            "401": {
              description: "Unauthorized",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
          },
        },
      },
      "/api/v1/auth/forgot-password": {
        post: {
          tags: ["Auth"],
          summary: "Request a password reset email",
          description:
            "Always returns a generic success message. Sends a 1-hour reset link when a customer account exists for the email (including Google-only accounts).",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email"],
                  properties: {
                    email: { type: "string", format: "email" },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "Accepted" },
            "400": { description: "Missing email" },
          },
        },
      },
      "/api/v1/auth/reset-password": {
        post: {
          tags: ["Auth"],
          summary: "Reset password with email token",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["token", "newPassword"],
                  properties: {
                    token: { type: "string" },
                    newPassword: { type: "string", minLength: 6 },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "Password updated" },
            "400": { description: "Invalid or expired token" },
          },
        },
      },
      "/api/v1/bookings": {
        post: {
          tags: ["Bookings"],
          summary: "Create a booking (guest or signed-in customer) — app or website",
          description: [
            "**App (body has courtId + start):** `{courtId, start, durationMinutes, usePoints?, useWallet?}`; guests add `guest: {name, email, phone}`. Send an `Idempotency-Key` header (any unique string per tap of Book): sending it again returns the first booking (200) instead of a new one. Price is worked out exactly like POST /bookings/quote.",
            "Response 201: `{booking, guestAccessToken}`. guestAccessToken (`gt_…`) is only for guests: keep it on the phone to open the booking later. It is shown once and never stored in plain form.",
            "Status is `reserved` until the advance is verified (nothing is auto-cancelled). If points cover the whole advance (toTransfer 0), the booking is `confirmed` straight away. No email is sent from the app path yet.",
            "Errors: 400 VALIDATION_ERROR, INVALID_PHONE, PHONE_REQUIRED (signed-in customer with no phone in profile), DATE_IN_PAST, DATE_OUT_OF_WINDOW, INVALID_DURATION; 403 STAFF_ACCOUNT; 404 COURT_NOT_FOUND; 409 SLOT_UNAVAILABLE, POINTS_CHANGED, REQUEST_IN_PROGRESS; 422 IDEMPOTENCY_KEY_REUSED (same key, different booking); 429 GUEST_LIMIT_REACHED (a guest email/phone already holds 3 upcoming bookings).",
            "",
            "**Website (unchanged):** body `CreateBookingInput` (courtType, date, startTime, duration …). Guests may book without auth. Membership hours / loyalty redeem require a customer account.",
          ].join("\n"),
          security: [{ bearerAuth: [] }, { cookieAuth: [] }, {}],
          parameters: [
            { name: "Idempotency-Key", in: "header", required: false, schema: { type: "string", maxLength: 200 } },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CreateBookingInput" },
                examples: {
                  app: {
                    summary: "App (guest)",
                    value: {
                      courtId: "6650c0ffee0000000000c001",
                      start: "2026-11-20T18:00:00+05:00",
                      durationMinutes: 90,
                      guest: { name: "Ali Raza", email: "ali@example.com", phone: "03001234567" },
                    },
                  },
                },
              },
            },
          },
          responses: {
            "201": {
              description: "App: booking made",
              content: {
                "application/json": {
                  example: {
                    booking: {
                      id: "6650c0ffee0000000000b001",
                      reference: "IBX-8821",
                      courtId: "6650c0ffee0000000000c001",
                      courtName: "Padel Court 1",
                      sport: "PADEL",
                      start: "2026-11-20T18:00:00+05:00",
                      durationMinutes: 90,
                      status: "reserved",
                      price: { courtFee: 9000, pointsUsed: 0, pointsDiscount: 0, total: 9000 },
                      payment: {
                        status: "awaiting_proof",
                        advanceRequired: 4500,
                        amountVerified: 0,
                        walletCreditUsed: 0,
                        balanceDue: 9000,
                        proofs: [],
                      },
                      cancellation: { canCancel: false, cancelUntil: "2026-11-20T14:00:00+05:00" },
                      refund: null,
                      hoursUsed: 0,
                      createdAt: "2026-11-07T15:00:00+05:00",
                    },
                    guestAccessToken: "gt_9c1f0b2e7a4d4c55b1f3a8e6d2c7b901",
                  },
                },
              },
            },
            "200": { description: "Website: booking created. App: same Idempotency-Key again → the first booking." },
            "400": {
              description: "Validation error",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
          },
        },
      },
      "/api/v1/bookings/availability": {
        get: {
          tags: ["Bookings"],
          summary: "Free times — one court (app) or a sport (website)",
          description: [
            "**App, one court:** `?courtId=&date=YYYY-MM-DD&durationMinutes=90`. Returns every start time of the day (courts are open 24 hours), free or taken (`available: false` — grey it out). Times already past (venue time) are left out. `price` is the full price for the duration after automatic discounts, whole PKR; `originalPrice` is before discounts. `rateType` is off_peak, standard or peak (at the start time).",
            "Errors: 400 DATE_IN_PAST, DATE_OUT_OF_WINDOW (window counts today: 14 days = today + 13), INVALID_DURATION (must be one of the sport's durationsMinutes from GET /sports), VALIDATION_ERROR; 404 COURT_NOT_FOUND.",
            "",
            "**Website, a sport (unchanged):** `?courtType=&date=&duration=&mode=times|quick&excludeBookingId=`.",
          ].join("\n"),
          parameters: [
            { name: "courtId", in: "query", schema: { type: "string" }, description: "App mode" },
            { name: "durationMinutes", in: "query", schema: { type: "integer", example: 90 }, description: "App mode" },
            {
              name: "date",
              in: "query",
              required: true,
              schema: { type: "string", example: "2026-11-05" },
            },
            {
              name: "courtType",
              in: "query",
              schema: { type: "string", enum: ["PADEL", "CRICKET", "PICKLEBALL", "FUTSAL"] },
              description: "Website mode",
            },
            { name: "duration", in: "query", schema: { type: "number", default: 1 }, description: "Website mode (hours)" },
            {
              name: "mode",
              in: "query",
              schema: { type: "string", enum: ["times", "quick"], default: "times" },
              description: "Website mode",
            },
            { name: "excludeBookingId", in: "query", schema: { type: "string" }, description: "Website mode" },
          ],
          responses: {
            "200": {
              description: "OK",
              content: {
                "application/json": {
                  example: {
                    courtId: "6650c0ffee0000000000c001",
                    date: "2026-11-05",
                    durationMinutes: 90,
                    slots: [
                      { start: "2026-11-05T16:30:00+05:00", available: true, rateType: "off_peak", price: 8250, originalPrice: 8250 },
                      { start: "2026-11-05T18:00:00+05:00", available: false, rateType: "peak", price: 9000, originalPrice: 9000 },
                    ],
                  },
                },
              },
            },
            "400": {
              description: "Wrong date or duration",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                  example: { error: "You can book up to 14 days ahead.", code: "DATE_OUT_OF_WINDOW" },
                },
              },
            },
            "404": {
              description: "Court not found or not active",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                  example: { error: "Court not found", code: "COURT_NOT_FOUND" },
                },
              },
            },
          },
        },
      },
      "/api/v1/health": {
        get: {
          tags: ["Auth"],
          summary: "Health check (Mongo connectivity)",
          responses: {
            "200": { description: "Healthy" },
            "503": { description: "Database unavailable" },
          },
        },
      },
      "/api/v1/account/password": {
        post: {
          tags: ["Account"],
          summary: "Set or change my password",
          description:
            "Google-only accounts can set a password without currentPassword. Accounts that already have a password must send currentPassword.",
          security: [{ bearerAuth: [] }, { cookieAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["newPassword"],
                  properties: {
                    currentPassword: { type: "string" },
                    newPassword: { type: "string", minLength: 6 },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "Password updated" },
            "400": { description: "Validation error" },
            "401": { description: "Unauthorized" },
          },
        },
      },
      "/api/v1/account/claim-bookings": {
        post: {
          tags: ["Account"],
          summary: "Claim guest bookings matching my email",
          security: [{ bearerAuth: [] }, { cookieAuth: [] }],
          responses: {
            "200": {
              description: "OK",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: { claimed: { type: "integer" } },
                  },
                },
              },
            },
          },
        },
      },
      "/api/v1/account/bookings": {
        get: {
          tags: ["Account"],
          summary: "List my upcoming and past bookings",
          description: [
            "**App: add `?format=app`.** Answer: `{upcoming: [Booking], past: {items: [Booking], nextCursor}}` — the same booking object as POST /bookings returns.",
            "- upcoming = reserved or confirmed and not finished yet, soonest first (all of them, no pages).",
            "- past = finished, cancelled or completed, newest first, in pages of `limit` (default 20, max 50). For the next page send `cursor=<nextCursor>`; nextCursor is null on the last page.",
            "- A confirmed booking whose time has passed shows status `completed`.",
            "Errors: 400 VALIDATION_ERROR (bad cursor or limit); 401 UNAUTHORIZED; 403 STAFF_ACCOUNT.",
            "",
            "**Website (no format):** unchanged.",
          ].join("\n"),
          security: [{ bearerAuth: [] }, { cookieAuth: [] }],
          parameters: [
            { name: "format", in: "query", required: false, schema: { type: "string", enum: ["app"] } },
            { name: "cursor", in: "query", required: false, schema: { type: "string" } },
            { name: "limit", in: "query", required: false, schema: { type: "integer", minimum: 1, maximum: 50 } },
          ],
          responses: {
            "200": {
              description: "OK",
              content: {
                "application/json": {
                  example: { upcoming: [{ id: "6650c0ffee0000000000b001", reference: "IBX-8821", status: "reserved" }], past: { items: [], nextCursor: null } },
                },
              },
            },
          },
        },
      },
      "/api/v1/account/bookings/{id}": {
        get: {
          tags: ["Account"],
          summary: "Get one of my bookings",
          description:
            "**App: add `?format=app`** → `{booking}` (the app's booking object). 404 BOOKING_NOT_FOUND if it isn't yours. **Website (no format):** unchanged `{booking, canCancel}`.",
          security: [{ bearerAuth: [] }, { cookieAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
            { name: "format", in: "query", required: false, schema: { type: "string", enum: ["app"] } },
          ],
          responses: {
            "200": { description: "OK" },
            "404": { description: "Not found (app: code BOOKING_NOT_FOUND)" },
          },
        },
        delete: {
          tags: ["Account"],
          summary: "Cancel my booking (within cancel window)",
          security: [{ bearerAuth: [] }, { cookieAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            "200": { description: "Cancelled" },
            "400": { description: "Cannot cancel" },
          },
        },
      },
      "/api/v1/account/loyalty": {
        get: {
          tags: ["Account"],
          summary: "Loyalty balance, hours played, ledger",
          security: [{ bearerAuth: [] }, { cookieAuth: [] }],
          responses: { "200": { description: "OK" } },
        },
      },
      "/api/v1/account/membership": {
        get: {
          tags: ["Account"],
          summary: "Active membership, history, and plan catalog",
          security: [{ bearerAuth: [] }, { cookieAuth: [] }],
          responses: { "200": { description: "OK" } },
        },
      },
      "/api/v1/account/support": {
        get: {
          tags: ["Account"],
          summary: "List my support tickets",
          security: [{ bearerAuth: [] }, { cookieAuth: [] }],
          responses: { "200": { description: "OK" } },
        },
        post: {
          tags: ["Account"],
          summary: "Create a support ticket",
          security: [{ bearerAuth: [] }, { cookieAuth: [] }],
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["topic", "message"],
                  properties: {
                    topic: { type: "string" },
                    message: { type: "string" },
                    bookingId: { type: "string" },
                  },
                },
              },
            },
          },
          responses: { "200": { description: "Created" } },
        },
      },
      "/api/v1/account/support/{id}/reply": {
        post: {
          tags: ["Account"],
          summary: "Reply to my support ticket",
          security: [{ bearerAuth: [] }, { cookieAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["message"],
                  properties: { message: { type: "string" } },
                },
              },
            },
          },
          responses: { "200": { description: "OK" } },
        },
      },
      "/api/v1/admin/bookings": {
        get: {
          tags: ["Admin"],
          summary: "List / query bookings (paginated, one, analytics, times, extension)",
          security: [{ bearerAuth: [] }, { cookieAuth: [] }],
          parameters: [
            {
              name: "mode",
              in: "query",
              schema: {
                type: "string",
                enum: [
                  "paginated",
                  "all",
                  "one",
                  "analytics",
                  "rebuild-analytics",
                  "available-times",
                  "extension",
                ],
              },
            },
            { name: "page", in: "query", schema: { type: "integer" } },
            { name: "limit", in: "query", schema: { type: "integer" } },
            { name: "search", in: "query", schema: { type: "string" } },
            { name: "dateFrom", in: "query", schema: { type: "string" } },
            { name: "dateTo", in: "query", schema: { type: "string" } },
            {
              name: "dates",
              in: "query",
              description: "Comma-separated YYYY-MM-DD for rebuild-analytics",
              schema: { type: "string" },
            },
            { name: "courtType", in: "query", schema: { type: "string" } },
            { name: "date", in: "query", schema: { type: "string" } },
            { name: "duration", in: "query", schema: { type: "number" } },
            { name: "bookingId", in: "query", schema: { type: "string" } },
          ],
          responses: { "200": { description: "OK" }, "401": { description: "Unauthorized" } },
        },
        post: {
          tags: ["Admin"],
          summary: "Create booking, extend (action=extend), or rebuild analytics",
          security: [{ bearerAuth: [] }, { cookieAuth: [] }],
          responses: { "200": { description: "OK" } },
        },
        patch: {
          tags: ["Admin"],
          summary: "Update a booking",
          security: [{ bearerAuth: [] }, { cookieAuth: [] }],
          responses: { "200": { description: "OK" } },
        },
        delete: {
          tags: ["Admin"],
          summary: "Delete a booking",
          security: [{ bearerAuth: [] }, { cookieAuth: [] }],
          parameters: [
            {
              name: "bookingId",
              in: "query",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: { "200": { description: "OK" } },
        },
      },
      "/api/v1/admin/courts": {
        get: {
          tags: ["Admin"],
          summary: "List courts",
          security: [{ bearerAuth: [] }, { cookieAuth: [] }],
          responses: { "200": { description: "OK" } },
        },
        post: {
          tags: ["Admin"],
          summary: "Create court",
          security: [{ bearerAuth: [] }, { cookieAuth: [] }],
          responses: { "200": { description: "OK" } },
        },
        patch: {
          tags: ["Admin"],
          summary: "Update court",
          security: [{ bearerAuth: [] }, { cookieAuth: [] }],
          responses: { "200": { description: "OK" } },
        },
        delete: {
          tags: ["Admin"],
          summary: "Delete court",
          security: [{ bearerAuth: [] }, { cookieAuth: [] }],
          responses: { "200": { description: "OK" } },
        },
      },
      "/api/v1/admin/users": {
        get: {
          tags: ["Admin"],
          summary: "List users",
          security: [{ bearerAuth: [] }, { cookieAuth: [] }],
          responses: { "200": { description: "OK" } },
        },
        post: {
          tags: ["Admin"],
          summary: "Create user",
          security: [{ bearerAuth: [] }, { cookieAuth: [] }],
          responses: { "200": { description: "OK" } },
        },
        patch: {
          tags: ["Admin"],
          summary: "Update user",
          security: [{ bearerAuth: [] }, { cookieAuth: [] }],
          responses: { "200": { description: "OK" } },
        },
        delete: {
          tags: ["Admin"],
          summary: "Delete user",
          security: [{ bearerAuth: [] }, { cookieAuth: [] }],
          responses: { "200": { description: "OK" } },
        },
      },
      "/api/v1/admin/discounts": {
        get: {
          tags: ["Admin"],
          summary: "List discounts",
          security: [{ bearerAuth: [] }, { cookieAuth: [] }],
          responses: { "200": { description: "OK" } },
        },
        post: {
          tags: ["Admin"],
          summary: "Create discount",
          security: [{ bearerAuth: [] }, { cookieAuth: [] }],
          responses: { "200": { description: "OK" } },
        },
        patch: {
          tags: ["Admin"],
          summary: "Update / toggle discount",
          security: [{ bearerAuth: [] }, { cookieAuth: [] }],
          responses: { "200": { description: "OK" } },
        },
        delete: {
          tags: ["Admin"],
          summary: "Delete discount",
          security: [{ bearerAuth: [] }, { cookieAuth: [] }],
          responses: { "200": { description: "OK" } },
        },
      },
      "/api/v1/admin/feedback": {
        get: {
          tags: ["Admin"],
          summary: "List feedback",
          security: [{ bearerAuth: [] }, { cookieAuth: [] }],
          responses: { "200": { description: "OK" } },
        },
      },
      "/api/v1/admin/ops": {
        get: {
          tags: ["Admin"],
          summary: "Membership plans, user memberships, or support inbox",
          security: [{ bearerAuth: [] }, { cookieAuth: [] }],
          parameters: [
            {
              name: "resource",
              in: "query",
              schema: {
                type: "string",
                enum: ["plans", "roster", "user-memberships", "support"],
              },
            },
            {
              name: "userId",
              in: "query",
              schema: { type: "string" },
              description: "Required when resource=user-memberships",
            },
          ],
          responses: { "200": { description: "OK" } },
        },
        post: {
          tags: ["Admin"],
          summary:
            "activate-membership | adjust-loyalty | reply-support",
          security: [{ bearerAuth: [] }, { cookieAuth: [] }],
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["action"],
                  properties: {
                    action: {
                      type: "string",
                      enum: [
                        "activate-membership",
                        "adjust-loyalty",
                        "reply-support",
                      ],
                    },
                    userId: { type: "string" },
                    planId: { type: "string" },
                    carryForwardHours: { type: "number" },
                    delta: { type: "number" },
                    note: { type: "string" },
                    ticketId: { type: "string" },
                    message: { type: "string" },
                    close: { type: "boolean" },
                  },
                },
              },
            },
          },
          responses: { "200": { description: "OK" } },
        },
      },
      "/api/v1/openapi": {
        get: {
          tags: ["Auth"],
          summary: "This OpenAPI document (JSON)",
          responses: { "200": { description: "OpenAPI 3.0 JSON" } },
        },
      },
      ...authPaths,
      ...catalogPaths,
    },
  } as const;
}
