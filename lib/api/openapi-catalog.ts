/**
 * OpenAPI pieces for Phase 2: profile, venue, sports, booking policy, courts,
 * and the super-admin settings. Merged into lib/api/openapi.ts.
 */

const ok = (description: string, example: unknown, schema?: Record<string, unknown>) => ({
  description,
  content: { "application/json": { ...(schema ? { schema } : {}), example } },
});

const err = (description: string, code: string, error: string) => ({
  description,
  content: {
    "application/json": { schema: { $ref: "#/components/schemas/Error" }, example: { error, code } },
  },
});

const venueExample = {
  name: "IBEX Sports Complex",
  branchName: "IBEX Islamabad",
  hoursLabel: "Open daily 12 PM – 4 AM",
  address: "Ibex Sports Complex, Toot Stop Near Orchid Marquee, Wild Life Park Road, Main Islamabad Expy, Islamabad, 42700",
  latitude: 33.5849499,
  longitude: 73.1439709,
  phone: "+923255429429",
  whatsApp: "+923255429429",
  email: "ibexsportscomplex@gmail.com",
  facilityNote: "Night slots now open",
  weatherSummary: null,
};

const sportExample = {
  sport: "PADEL",
  label: "Padel",
  showInApp: true,
  imageUrl: "https://staging.ibexsportscomplex.com/images/paddle.jpg",
  badge: "Most Popular",
  courtCount: 2,
  fromPricePerHour: 4500,
  booking: { durationsMinutes: [60, 90, 120], defaultDurationMinutes: 90, bookingWindowDays: 14 },
};

const courtExample = {
  id: "6650c0ffee0000000000c001",
  _id: "6650c0ffee0000000000c001",
  name: "Padel Court 1",
  sport: "PADEL",
  type: "PADEL",
  description: "Panoramic glass court",
  imageUrl: "https://staging.ibexsportscomplex.com/images/paddle.jpg",
  surfaceLabel: "Pro turf",
  isIndoor: true,
  hasRacketRental: true,
  startingPricePerHour: 4500,
  features: [{ key: "lighting", label: "LED lighting" }],
  highlight: { key: "video", label: "Match replay" },
  slotsOpenToday: 21,
  hasPeakSlotsOpen: true,
  pricePerHour: 6000,
  isActive: true,
};

const profileExample = {
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
  dateOfBirth: "1995-06-12",
  gender: "male",
  city: "Islamabad",
  signInMethod: "email",
  hasPassword: true,
  hasGoogleAuth: false,
};

export const catalogPaths = {
  "/api/v1/account/profile": {
    get: {
      tags: ["Account"],
      summary: "Get my profile",
      description:
        "App fields (id, firstName, lastName, phone as 03XXXXXXXXX, imageUrl, memberSince, dateOfBirth, gender, city, signInMethod) plus the website's older fields.",
      security: [{ bearerAuth: [] }, { cookieAuth: [] }],
      responses: {
        "200": ok("My profile", { user: profileExample }),
        "401": err("Not signed in", "UNAUTHORIZED", "Unauthorized"),
        "403": err("Staff account", "STAFF_ACCOUNT", "Customer account required"),
      },
    },
    patch: {
      tags: ["Account"],
      summary: "Update my profile",
      description:
        "Send only what changes. App: firstName, lastName (1–50 each), phone, dateOfBirth (YYYY-MM-DD or null), gender (male / female / unspecified or null), city (or null). Website: name, phone. Email can't be changed. Returns the saved profile.",
      security: [{ bearerAuth: [] }, { cookieAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                firstName: { type: "string", maxLength: 50 },
                lastName: { type: "string", maxLength: 50 },
                phone: { type: "string", example: "03008521942" },
                dateOfBirth: { type: "string", nullable: true, example: "1995-06-12" },
                gender: { type: "string", nullable: true, enum: ["male", "female", "unspecified"] },
                city: { type: "string", nullable: true, maxLength: 60 },
              },
            },
            example: { firstName: "Hamza", lastName: "Khan", phone: "03008521942", city: "Islamabad" },
          },
        },
      },
      responses: {
        "200": ok("Saved profile", { user: profileExample }),
        "400": err("Wrong input (INVALID_PHONE or VALIDATION_ERROR)", "INVALID_PHONE", "Please enter a valid Pakistani mobile number (03XXXXXXXXX)."),
        "401": err("Not signed in", "UNAUTHORIZED", "Unauthorized"),
      },
    },
  },
  "/api/v1/venue": {
    get: {
      tags: ["Venue"],
      summary: "Venue details and contacts",
      description: "Edited by the super admin in Admin → App Settings.",
      responses: { "200": ok("Venue", venueExample) },
    },
  },
  "/api/v1/sports": {
    get: {
      tags: ["Venue"],
      summary: "Sports shown in the app, with booking rules",
      description:
        "Hidden sports (showInApp false, e.g. Cricket) are left out. The app shows exactly durationsMinutes and selects defaultDurationMinutes. bookingWindowDays = how many days ahead customers can book. fromPricePerHour is null when the sport has no priced courts.",
      responses: { "200": ok("Sports", { sports: [sportExample] }) },
    },
  },
  "/api/v1/booking-policy": {
    get: {
      tags: ["Venue"],
      summary: "General booking rules",
      description: "Customers can cancel in the app until cancellationNoticeMinutes before the start (240 = 4 hours).",
      responses: { "200": ok("Policy", { cancellationNoticeMinutes: 240 }) },
    },
  },
  "/api/v1/courts": {
    get: {
      tags: ["Venue"],
      summary: "Active courts (optional ?sport=PADEL)",
      description:
        "`?sport=` (app) or `?type=` (website). Each court has the website's fields plus the app's. imageUrl is the court photo, or the sport photo when none is set. startingPricePerHour is the cheapest hourly price (whole PKR). slotsOpenToday counts start times still free today for the sport's default duration; hasPeakSlotsOpen says whether any of them is peak.",
      parameters: [
        {
          name: "sport",
          in: "query",
          required: false,
          schema: { type: "string", enum: ["PADEL", "PICKLEBALL", "FUTSAL", "CRICKET"] },
        },
      ],
      responses: {
        "200": ok("Courts", { courts: [courtExample] }),
        "400": err("Unknown sport", "VALIDATION_ERROR", "Unknown sport"),
      },
    },
  },
  "/api/v1/bookings/quote": {
    post: {
      tags: ["Bookings"],
      summary: "Price check before booking (guest or signed in)",
      description: [
        "Nothing is saved or reserved. Order: court fee (after automatic promotions) → membership hours → points → total → advance → wallet → toTransfer → pointsToEarn. All money is whole PKR.",
        "- hours (signed-in customers): the hours left for THIS court's sport. With `useHours: true` the customer's hours are used in half hours, up to the booking length; they pay the rest. hours.discount is the same share of the court fee (e.g. 1 h of a 1.5 h booking = 2/3 of the fee). When hours can't be used, canUse is false and reasonCode says why: NO_MEMBERSHIP, SPORT_NOT_INCLUDED, NO_HOURS_LEFT, WEEKDAYS_ONLY, TOO_SOON (book at least 2 h ahead on weekdays, 24 h on weekends), EXPIRES_BEFORE_BOOKING.",
        "- Points are worked out on the fee left after hours. Hours, points and wallet can all be used together.",
        "- total = courtFee − hours discount − points discount (wallet is money, not a discount).",
        "- advanceRequired = advancePercent of total, rounded UP. advancePercent comes from Admin → App Settings (50 today).",
        "- toTransfer = advanceRequired − wallet used (never below 0). 0 means the booking can be confirmed straight away.",
        "- Guests: points and wallet are null. Points rules come from App Settings (today: 10 per hour played, use from 100, up to 50% of the fee, 1 point = PKR 1).",
        "Errors: 400 VALIDATION_ERROR (bad start), DATE_IN_PAST, DATE_OUT_OF_WINDOW, INVALID_DURATION; 404 COURT_NOT_FOUND; 409 SLOT_UNAVAILABLE.",
      ].join("\n"),
      security: [{ bearerAuth: [] }, {}],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["courtId", "start", "durationMinutes"],
              properties: {
                courtId: { type: "string" },
                start: { type: "string", format: "date-time", example: "2026-11-05T18:00:00+05:00" },
                durationMinutes: { type: "integer", example: 90 },
                useHours: { type: "boolean", description: "Use membership hours of this court's sport" },
                usePoints: { type: "boolean" },
                useWallet: { type: "boolean" },
              },
            },
            example: {
              courtId: "6650c0ffee0000000000c001",
              start: "2026-11-05T18:00:00+05:00",
              durationMinutes: 90,
              usePoints: true,
              useWallet: true,
            },
          },
        },
      },
      responses: {
        "200": ok("Price", {
          courtId: "6650c0ffee0000000000c001",
          courtName: "Padel Court 1",
          sport: "PADEL",
          start: "2026-11-05T18:00:00+05:00",
          durationMinutes: 90,
          rateType: "peak",
          originalCourtFee: 9000,
          promotionDiscount: 0,
          courtFee: 9000,
          hours: { available: 7.5, canUse: false, reasonCode: null, used: 0, discount: 0 },
          points: { available: 1850, canUse: true, minToUse: 500, maxUsable: 1850, used: 1850, discount: 1850 },
          wallet: { available: 2000, used: 2000 },
          total: 7150,
          advancePercent: 50,
          advanceRequired: 3575,
          toTransfer: 1575,
          remainingAfterAdvance: 3575,
          pointsToEarn: 710,
        }),
        "400": err("Wrong input", "INVALID_DURATION", "Choose one of: 60, 90, 120 minutes."),
        "404": err("Court not found", "COURT_NOT_FOUND", "Court not found"),
        "409": err("Already booked", "SLOT_UNAVAILABLE", "This time is already booked. Please pick another."),
      },
    },
  },
  "/api/v1/admin/settings": {
    get: {
      tags: ["Admin"],
      summary: "Super admin: read app settings",
      security: [{ cookieAuth: [] }, { bearerAuth: [] }],
      responses: { "200": ok("Settings", { settings: { venue: venueExample, sports: [], cancellationNoticeMinutes: 240 } }) },
    },
    patch: {
      tags: ["Admin"],
      summary: "Super admin: change app settings",
      description:
        "Send only the parts that change. Durations: steps of 30 minutes, Futsal from 90, others from 60, up to 720. The default must be one of the durations.",
      security: [{ cookieAuth: [] }, { bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            example: {
              cancellationNoticeMinutes: 240,
              venue: { hoursLabel: "Open 24 hours" },
              sports: [{ sport: "FUTSAL", durationsMinutes: [90, 180], defaultDurationMinutes: 90 }],
            },
          },
        },
      },
      responses: {
        "200": ok("Saved", { settings: { cancellationNoticeMinutes: 240 } }),
        "400": err("Wrong input", "VALIDATION_ERROR", "FUTSAL: durations must be steps of 30 minutes, from 90 to 720."),
        "403": err("Not a super admin", "FORBIDDEN", "Super admin only"),
      },
    },
  },
};
