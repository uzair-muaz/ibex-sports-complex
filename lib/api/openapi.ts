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
        "- **Flutter / mobile**: Google Sign-In ID token → `POST /api/v1/auth/google` → `Authorization: Bearer <accessToken>`.",
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
          description: "Access token from POST /api/v1/auth/google",
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
          properties: { error: { type: "string" } },
          required: ["error"],
        },
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
      "/api/v1/auth/google": {
        post: {
          tags: ["Auth"],
          summary: "Exchange Google ID token for API access token",
          description:
            "Verify a Google ID token from the mobile/web SDK and return a Bearer JWT for subsequent API calls.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["idToken"],
                  properties: {
                    idToken: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Authenticated",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      accessToken: { type: "string" },
                      tokenType: { type: "string", example: "Bearer" },
                      expiresIn: { type: "string", example: "30d" },
                      user: { $ref: "#/components/schemas/ApiUser" },
                    },
                  },
                },
              },
            },
            "401": {
              description: "Invalid token",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
          },
        },
      },
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
      "/api/v1/auth/register": {
        post: {
          tags: ["Auth"],
          summary: "Register a customer account (email + password)",
          description:
            "Creates a role=user account. Does not return a session cookie — web clients should call NextAuth credentials sign-in after success. Never creates staff roles.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["name", "email", "password", "phone"],
                  properties: {
                    name: { type: "string", minLength: 2 },
                    email: { type: "string", format: "email" },
                    password: { type: "string", minLength: 6 },
                    phone: {
                      type: "string",
                      description: "Pakistani mobile, e.g. 03XXXXXXXXX",
                    },
                  },
                },
              },
            },
          },
          responses: {
            "201": {
              description: "Created",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      user: {
                        type: "object",
                        properties: {
                          id: { type: "string" },
                          email: { type: "string" },
                          name: { type: "string" },
                          role: { type: "string", example: "user" },
                        },
                      },
                    },
                  },
                },
              },
            },
            "400": {
              description: "Validation error or email already registered",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
          },
        },
      },
      "/api/v1/bookings": {
        post: {
          tags: ["Bookings"],
          summary: "Create a booking (guest or authenticated customer)",
          description:
            "Guests may book without auth. Authenticated customers (cookie or Bearer) are linked via userId. Membership hours / loyalty redeem require a customer account.",
          security: [{ bearerAuth: [] }, { cookieAuth: [] }, {}],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CreateBookingInput" },
              },
            },
          },
          responses: {
            "200": { description: "Booking created" },
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
          summary: "Public availability quotes for a court type / date",
          description:
            "mode=times (default) returns priced start times; mode=quick returns per-slot court counts.",
          parameters: [
            {
              name: "courtType",
              in: "query",
              required: true,
              schema: {
                type: "string",
                enum: ["PADEL", "CRICKET", "PICKLEBALL", "FUTSAL"],
              },
            },
            {
              name: "date",
              in: "query",
              required: true,
              schema: { type: "string", example: "2026-08-15" },
            },
            {
              name: "duration",
              in: "query",
              schema: { type: "number", default: 1 },
            },
            {
              name: "mode",
              in: "query",
              schema: { type: "string", enum: ["times", "quick"], default: "times" },
            },
            {
              name: "excludeBookingId",
              in: "query",
              schema: { type: "string" },
            },
          ],
          responses: {
            "200": { description: "OK" },
            "400": { description: "Validation error" },
          },
        },
      },
      "/api/v1/courts": {
        get: {
          tags: ["Bookings"],
          summary: "Public active courts catalog",
          parameters: [
            {
              name: "type",
              in: "query",
              schema: {
                type: "string",
                enum: ["PADEL", "CRICKET", "PICKLEBALL", "FUTSAL"],
              },
            },
          ],
          responses: { "200": { description: "OK" } },
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
      "/api/v1/account/profile": {
        get: {
          tags: ["Account"],
          summary: "Get my profile",
          security: [{ bearerAuth: [] }, { cookieAuth: [] }],
          responses: {
            "200": { description: "OK" },
            "401": { description: "Unauthorized" },
          },
        },
        patch: {
          tags: ["Account"],
          summary: "Update my profile (name, phone)",
          security: [{ bearerAuth: [] }, { cookieAuth: [] }],
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    phone: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "OK" },
            "401": { description: "Unauthorized" },
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
          security: [{ bearerAuth: [] }, { cookieAuth: [] }],
          responses: { "200": { description: "OK" } },
        },
      },
      "/api/v1/account/bookings/{id}": {
        get: {
          tags: ["Account"],
          summary: "Get one of my bookings",
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
            "200": { description: "OK" },
            "404": { description: "Not found" },
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
    },
  } as const;
}
