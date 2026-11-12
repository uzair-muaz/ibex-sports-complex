/**
 * OpenAPI pieces for mobile sign-in (Phase 1). Merged into lib/api/openapi.ts.
 */

const errorResponse = (description: string, code: string, error: string) => ({
  description,
  content: {
    "application/json": {
      schema: { $ref: "#/components/schemas/Error" },
      example: { error, code },
    },
  },
});

const signInOk = (description: string, isNewAccount = false) => ({
  description,
  content: {
    "application/json": {
      schema: { $ref: "#/components/schemas/SignInResponse" },
      example: {
        accessToken: "eyJhbGciOiJIUzI1NiJ9…",
        refreshToken: "r_93kdQ…",
        tokenType: "Bearer",
        expiresAt: "2026-12-07T18:00:00+05:00",
        expiresIn: "30d",
        refreshExpiresAt: "2027-01-06T18:00:00+05:00",
        isNewAccount,
        claimedBookings: isNewAccount ? 2 : 0,
        user: {
          id: "6aef081351e124b88178c99a",
          firstName: "Hamza",
          lastName: "Khan",
          name: "Hamza Khan",
          email: "hamza@example.com",
          phone: "03008521942",
          imageUrl: null,
          image: null,
          role: "user",
          memberSince: "2023-11-04T00:00:00+05:00",
          dateOfBirth: null,
          gender: null,
          city: null,
          signInMethod: "email",
        },
      },
    },
  },
});

const json = (schema: Record<string, unknown>, example?: Record<string, unknown>) => ({
  required: true,
  content: { "application/json": { schema, ...(example ? { example } : {}) } },
});

const staff = errorResponse(
  "Staff / admin accounts cannot use the customer app (STAFF_ACCOUNT), or the super admin blocked this customer (ACCOUNT_BLOCKED: show the message and sign out)",
  "STAFF_ACCOUNT",
  "Staff accounts cannot sign in to the customer app. Please use the website admin panel.",
);

export const authSchemas = {
  MobileUser: {
    type: "object",
    properties: {
      id: { type: "string" },
      firstName: { type: "string" },
      lastName: { type: "string" },
      name: { type: "string", description: "Full name (older clients)" },
      email: { type: "string" },
      phone: { type: "string", nullable: true, example: "03008521942" },
      imageUrl: { type: "string", nullable: true },
      image: { type: "string", nullable: true, description: "Same as imageUrl (older clients)" },
      role: { type: "string", enum: ["user"] },
      memberSince: { type: "string", format: "date-time", nullable: true },
      dateOfBirth: { type: "string", nullable: true, description: "Phase 2" },
      gender: { type: "string", nullable: true, description: "Phase 2" },
      city: { type: "string", nullable: true, description: "Phase 2" },
      signInMethod: { type: "string", enum: ["email", "google", "apple"] },
    },
  },
  SignInResponse: {
    type: "object",
    required: ["accessToken", "refreshToken", "expiresAt", "isNewAccount", "claimedBookings", "user"],
    properties: {
      accessToken: { type: "string", description: "Send as `Authorization: Bearer <accessToken>`" },
      refreshToken: {
        type: "string",
        description: "Works once. Send to POST /api/v1/auth/refresh for a new pair.",
      },
      tokenType: { type: "string", example: "Bearer" },
      expiresAt: { type: "string", format: "date-time", description: "When the access token stops working (+05:00)" },
      expiresIn: { type: "string", example: "30d", description: "Older clients" },
      refreshExpiresAt: { type: "string", format: "date-time" },
      isNewAccount: { type: "boolean", description: "True the first time. The app shows the sign-up bonus." },
      claimedBookings: {
        type: "integer",
        description:
          "Guest bookings with the same email now linked to this account. Only for verified emails (Google / Apple).",
      },
      user: { $ref: "#/components/schemas/MobileUser" },
    },
  },
};

export const authPaths = {
  "/api/v1/auth/google": {
    post: {
      tags: ["Auth"],
      summary: "Sign in with Google (Android / iPhone / web client IDs)",
      description:
        "Verify a Google ID token and return access + refresh tokens. Creates the customer on first sign-in and links guest bookings with the same email.",
      requestBody: json(
        { type: "object", required: ["idToken"], properties: { idToken: { type: "string" } } },
        { idToken: "eyJhbGciOiJSUzI1NiIs…" },
      ),
      responses: {
        "200": signInOk("Signed in", true),
        "400": errorResponse("Missing idToken", "VALIDATION_ERROR", "idToken is required"),
        "401": errorResponse("Token could not be verified", "INVALID_GOOGLE_TOKEN", "Invalid Value"),
        "403": staff,
      },
    },
  },
  "/api/v1/auth/apple": {
    post: {
      tags: ["Auth"],
      summary: "Sign in with Apple",
      description:
        "Verify Apple's identityToken (needs APPLE_BUNDLE_ID on the server). Linked by Apple's user id (sub) because Apple may hide the email. Send fullName on the first sign-in — Apple only gives it once. authorizationCode is accepted but not used yet.",
      requestBody: json(
        {
          type: "object",
          required: ["identityToken"],
          properties: {
            identityToken: { type: "string" },
            authorizationCode: { type: "string" },
            fullName: {
              type: "object",
              properties: { givenName: { type: "string" }, familyName: { type: "string" } },
            },
          },
        },
        { identityToken: "eyJraWQiOi…", authorizationCode: "c1a2…", fullName: { givenName: "Sara", familyName: "Ali" } },
      ),
      responses: {
        "200": signInOk("Signed in", true),
        "400": errorResponse(
          "Missing token, or Apple shared no email for a new account",
          "INVALID_APPLE_TOKEN",
          "Apple did not share an email.",
        ),
        "401": errorResponse("Token could not be verified", "INVALID_APPLE_TOKEN", "Apple sign-in could not be verified."),
        "403": staff,
      },
    },
  },
  "/api/v1/auth/login": {
    post: {
      tags: ["Auth"],
      summary: "Sign in with email and password",
      requestBody: json(
        {
          type: "object",
          required: ["email", "password"],
          properties: { email: { type: "string", format: "email" }, password: { type: "string" } },
        },
        { email: "hamza@example.com", password: "password123" },
      ),
      responses: {
        "200": signInOk("Signed in"),
        "400": errorResponse("Missing email or password", "VALIDATION_ERROR", "Please enter your email and password."),
        "401": errorResponse(
          "Wrong password (or PASSWORD_NOT_SET for Google / Apple-only accounts)",
          "WRONG_PASSWORD",
          "Incorrect password.",
        ),
        "403": staff,
        "404": errorResponse("No account with this email", "ACCOUNT_NOT_FOUND", "No account found with this email."),
      },
    },
  },
  "/api/v1/auth/register": {
    post: {
      tags: ["Auth"],
      summary: "Create a customer account (email + password)",
      description:
        "Mobile shape `{firstName, lastName, email, phone, password}` (password ≥ 8) returns the full sign-in answer. The website's older shape `{name, email, phone, password}` (password ≥ 6) still returns only `{user}`. Never creates staff.",
      requestBody: json(
        {
          type: "object",
          required: ["firstName", "email", "phone", "password"],
          properties: {
            firstName: { type: "string", minLength: 1, maxLength: 50 },
            lastName: { type: "string", maxLength: 50 },
            email: { type: "string", format: "email" },
            phone: { type: "string", description: "Pakistani mobile, 03XXXXXXXXX" },
            password: { type: "string", minLength: 8 },
            name: { type: "string", description: "Website only, instead of firstName/lastName" },
          },
        },
        { firstName: "Hamza", lastName: "Khan", email: "hamza@example.com", phone: "03008521942", password: "password123" },
      ),
      responses: {
        "201": signInOk("Created", true),
        "400": errorResponse(
          "Wrong input (VALIDATION_ERROR, INVALID_PHONE or WEAK_PASSWORD)",
          "INVALID_PHONE",
          "Please enter a valid Pakistani mobile number (03XXXXXXXXX).",
        ),
        "409": errorResponse(
          "Email already has an account",
          "EMAIL_IN_USE",
          "An account with this email already exists. Sign in instead.",
        ),
      },
    },
  },
  "/api/v1/auth/refresh": {
    post: {
      tags: ["Auth"],
      summary: "Get a new access token",
      description:
        "Each refresh token works once and is swapped for a new pair. Re-using an old one cancels every refresh token of that account (theft protection).",
      requestBody: json(
        { type: "object", required: ["refreshToken"], properties: { refreshToken: { type: "string" } } },
        { refreshToken: "r_93kdQ…" },
      ),
      responses: {
        "200": signInOk("New tokens"),
        "401": errorResponse(
          "Refresh token expired, used, or cancelled. The app signs the user out.",
          "REFRESH_EXPIRED",
          "Please sign in again.",
        ),
      },
    },
  },
  "/api/v1/auth/logout": {
    post: {
      tags: ["Auth"],
      summary: "Sign out (cancel the refresh token)",
      description:
        "Send the refresh token to cancel it; works even if the access token already ran out. `allDevices: true` (needs a Bearer token) cancels every refresh token. Access tokens are not cancelled — they run out at expiresAt, so the app must delete its copy.",
      security: [{ bearerAuth: [] }, {}],
      requestBody: json(
        {
          type: "object",
          properties: { refreshToken: { type: "string" }, allDevices: { type: "boolean" } },
        },
        { refreshToken: "r_93kdQ…" },
      ),
      responses: {
        "200": {
          description: "Signed out",
          content: { "application/json": { example: { success: true, revoked: 1 } } },
        },
        "401": errorResponse("No refresh token and not signed in", "UNAUTHORIZED", "Unauthorized"),
      },
    },
  },
  "/api/v1/account/change-password": {
    post: {
      tags: ["Account"],
      summary: "Change password (mobile)",
      description:
        "New password ≥ 8. Signs out other phones (cancels all refresh tokens) and returns a fresh token pair for this phone.",
      security: [{ bearerAuth: [] }],
      requestBody: json(
        {
          type: "object",
          required: ["oldPassword", "newPassword"],
          properties: {
            oldPassword: { type: "string", description: "`currentPassword` also accepted" },
            newPassword: { type: "string", minLength: 8 },
          },
        },
        { oldPassword: "password123", newPassword: "newpassword1" },
      ),
      responses: {
        "200": signInOk("Changed; new tokens for this phone"),
        "400": errorResponse("New password too short", "WEAK_PASSWORD", "New password must be at least 8 characters."),
        "401": errorResponse("Old password wrong (or not signed in: UNAUTHORIZED)", "WRONG_PASSWORD", "Current password is incorrect."),
        "403": errorResponse("Staff account", "STAFF_ACCOUNT", "Customer account required"),
      },
    },
  },
};
