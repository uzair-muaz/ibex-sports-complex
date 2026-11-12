const sec = [{ bearerAuth: [] }, { cookieAuth: [] }];

/** Staff tools for a customer's membership hours bank. */
export const membershipAdminPaths = {
  "/api/v1/promo-codes/check": {
    post: {
      tags: ["Bookings"],
      summary: "Does this promo code work? (public)",
      description:
        "Body `{code, sport, courtFee, email?}`. For the website's Apply button; the app can use POST /bookings/quote with promoCode instead. Answer `{valid: true, code, discount, description}` or `{valid: false, code, reasonCode, message}`. Only a check: the booking checks again with the server's own price. 20 tries per visitor per 10 minutes (429 RATE_LIMITED).",
      requestBody: { required: true, content: { "application/json": { example: { code: "EID20", sport: "PADEL", courtFee: 4500 } } } },
      responses: {
        "200": { description: "OK", content: { "application/json": { example: { valid: true, code: "EID20", discount: 900, description: "Eid offer" } } } },
        "400": { description: "VALIDATION_ERROR" },
        "429": { description: "RATE_LIMITED" },
      },
    },
  },
  "/api/v1/admin/promo-codes": {
    get: { tags: ["Admin"], summary: "Staff: all promo codes, with uses and PKR given", security: sec, responses: { "200": { description: "`{items: [...]}`" } } },
    post: {
      tags: ["Admin"],
      summary: "Super admin: make a promo code",
      description:
        "Body: `{code, description?, type: percentage|fixed, value, maxDiscountPkr?, minFeePkr?, sports? ([] = all), validFrom?, validUntil?, maxUses?, maxUsesPerCustomer? (default 1, 0 = no limit), newCustomersOnly?, isActive?}`. The code comes off the court fee after automatic discounts. A use is given back when the booking is cancelled (not when staff keep the money).",
      security: sec,
      requestBody: { required: true, content: { "application/json": { example: { code: "EID20", description: "Eid offer", type: "percentage", value: 20, maxDiscountPkr: 2000, sports: [], maxUsesPerCustomer: 1 } } } },
      responses: { "201": { description: "Created" }, "400": { description: "VALIDATION_ERROR" }, "403": { description: "Super admin only" }, "409": { description: "DUPLICATE" } },
    },
  },
  "/api/v1/admin/promo-codes/{id}": {
    get: { tags: ["Admin"], summary: "Staff: who used this code", security: sec, parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "`{uses: [...]}`" } } },
    patch: {
      tags: ["Admin"],
      summary: "Super admin: change a code (or switch it on/off with isActive)",
      description: "Any field from POST. The code's name can't change once it was used (409 CODE_IN_USE).",
      security: sec,
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      responses: { "200": { description: "Saved" }, "409": { description: "CODE_IN_USE or DUPLICATE" } },
    },
    delete: {
      tags: ["Admin"],
      summary: "Super admin: delete a code nobody used",
      description: "A used code can't be deleted (409 CODE_IN_USE): switch it off instead.",
      security: sec,
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      responses: { "200": { description: "Deleted" }, "409": { description: "CODE_IN_USE" } },
    },
  },
  "/api/v1/admin/closures": {
    get: { tags: ["Admin"], summary: "Staff: closures still to come (?past=1 adds old ones)", description: "Each has `affectedBookings`: active bookings already inside it.", security: sec, responses: { "200": { description: "`{items: [...]}`" } } },
    post: {
      tags: ["Admin"],
      summary: "Super admin: close courts for a time",
      description:
        "Body `{courtIds ([] = every court), startsAt, endsAt (on the hour or half hour, at most 90 days), reason (staff only), publicNote? (shown to customers)}`. The time can't be booked on the app or the website from now on. Bookings already inside it stay: the reply's `affectedBookings` says how many; GET /admin/closures/{id} lists them.",
      security: sec,
      requestBody: { required: true, content: { "application/json": { example: { courtIds: ["69607301a5bc0098eadcfa85"], startsAt: "2026-11-13T09:00:00+05:00", endsAt: "2026-11-13T14:00:00+05:00", reason: "Glass repair", publicNote: "Closed for maintenance." } } } },
      responses: { "201": { description: "Created" }, "400": { description: "VALIDATION_ERROR" }, "403": { description: "Super admin only" }, "404": { description: "COURT_NOT_FOUND" } },
    },
  },
  "/api/v1/admin/closures/{id}": {
    get: { tags: ["Admin"], summary: "Staff: a closure and the bookings inside it", description: "`{closure, bookings: [{id, reference, date, startTime, duration, status, court, customer: {userId, name, email, phone}, total, paid}]}` — to call, move or cancel them.", security: sec, parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "OK" }, "404": { description: "NOT_FOUND" } } },
    patch: { tags: ["Admin"], summary: "Super admin: change a closure", description: "Any field from POST.", security: sec, parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Saved" }, "400": { description: "VALIDATION_ERROR" } } },
    delete: { tags: ["Admin"], summary: "Super admin: remove a closure (the time can be booked again)", security: sec, parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Deleted" } } },
  },
  "/api/v1/admin/broadcasts": {
    get: { tags: ["Admin"], summary: "Staff: messages sent to customers", security: sec, responses: { "200": { description: "`{items: [...]}`" } } },
    post: {
      tags: ["Admin"],
      summary: "Super admin: send a message to customers",
      description:
        "Body `{title (3–80), body (3–500), kind: venue_news|offer, audience: all|closure|one, closureId? (audience closure), email? (audience one)}`. First send with `dryRun: true` to get `{customers, withApp, guestBookings}`; then send with `confirm: true`. It goes to each customer's in-app list (type venue_news or offer) and as a push (data `{type, broadcastId}`). venue_news always pushes; offer only pushes to customers with the newsletter switch on. Push only really goes out when the server has NOTIFY_SEND_PUSH=true.",
      security: sec,
      requestBody: { required: true, content: { "application/json": { example: { title: "Padel closed Friday morning", body: "Padel courts are closed on Friday 9 AM–2 PM for repairs.", kind: "venue_news", audience: "all", confirm: true } } } },
      responses: { "200": { description: "Dry run counts" }, "201": { description: "Sent: `{broadcast: {id, inAppCount, pushSent, pushLogged, guestBookings}}`" }, "400": { description: "VALIDATION_ERROR, CONFIRM_NEEDED or NO_RECIPIENTS" }, "403": { description: "Super admin only" } },
    },
  },
  "/api/v1/admin/reports": {
    get: {
      tags: ["Admin"],
      summary: "Super admin: money, wallet, points, memberships and codes for a period",
      description:
        "`?from=YYYY-MM-DD&to=YYYY-MM-DD` (both days included, Pakistan time, at most 366 days). bookings count by game day: courtFees, autoDiscounts, promo, points, hours, total, cash, online, unsplit (older bookings with one paid amount), wallet, received, due, hoursUsed, bySport, bySource, autoDiscountUse, promoUse, cancelled {count, toWallet, paidBack}. wallet: balanceNow (held by customers now), credited/debited by reason in the period. points: balanceNow, pkrPerPoint, byType. memberships: sold, revenue, activeNow, byPlan, byMethod (by sale date).",
      security: sec,
      parameters: [
        { name: "from", in: "query", required: true, schema: { type: "string", example: "2026-11-01" } },
        { name: "to", in: "query", required: true, schema: { type: "string", example: "2026-11-30" } },
      ],
      responses: { "200": { description: "OK" }, "400": { description: "VALIDATION_ERROR" }, "403": { description: "Super admin only" } },
    },
  },
  "/api/v1/admin/reports/export": {
    get: {
      tags: ["Admin"],
      summary: "Super admin: download a spreadsheet (CSV)",
      description: "`?kind=bookings|payments|wallet|points|memberships&from=&to=`. A CSV file Excel opens (up to 20,000 rows). Bookings by game day; the rest by when they happened.",
      security: sec,
      parameters: [
        { name: "kind", in: "query", required: true, schema: { type: "string", enum: ["bookings", "payments", "wallet", "points", "memberships"] } },
        { name: "from", in: "query", required: true, schema: { type: "string" } },
        { name: "to", in: "query", required: true, schema: { type: "string" } },
      ],
      responses: { "200": { description: "text/csv file" }, "400": { description: "VALIDATION_ERROR" }, "403": { description: "Super admin only" } },
    },
  },
  "/api/v1/admin/audit": {
    get: {
      tags: ["Admin"],
      summary: "Super admin: audit log (who changed what)",
      description:
        "Newest first, 50 per page. Filters: `area` (settings, courts, discounts, promo_codes, membership_plans, memberships, wallet, points, bookings, payments, closures, messages, users), `actorId` (staff), `customerId`, `targetId`, `q` (search the summary and name), `from`/`to` (YYYY-MM-DD), `cursor`. Each item: `{id, at, by: {id, name}, role, area, action, targetId, targetLabel, customerId, summary, changes: [{path, from, to}]}`. Passwords and secrets are never stored.",
      security: sec,
      responses: { "200": { description: "`{items, total, nextCursor}`" }, "403": { description: "Super admin only" } },
    },
  },
  "/api/v1/admin/media": {
    post: {
      tags: ["Admin"],
      summary: "Super admin: upload a court or sport photo",
      description:
        "multipart/form-data: `file` (JPG, PNG or WebP, up to 3 MB; checked by its content, not its name) and `kind` (`court_photo` or `sport_photo`). Answer `{id, url}`: put `url` in the court's `image` or the sport's `imageUrl` and save. Photos are kept in the database and never change (a new photo gets a new link).",
      security: sec,
      responses: { "201": { description: "`{id, url}`" }, "400": { description: "INVALID_FILE or VALIDATION_ERROR" }, "403": { description: "Super admin only" } },
    },
  },
  "/api/v1/media/{id}": {
    get: {
      tags: ["Catalog"],
      summary: "Public: an uploaded photo",
      description: "The photo itself (image/jpeg, image/png or image/webp), cached for a year. Court and sport `imageUrl`s in the app API already point here as full links.",
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      responses: { "200": { description: "The photo" }, "404": { description: "Not found" } },
    },
  },
  "/api/v1/admin/customers/{id}/block": {
    post: {
      tags: ["Admin"],
      summary: "Super admin: block or unblock a customer",
      description:
        "Body `{blocked: true, reason}` or `{blocked: false}`. Blocked: signed out of the app (refresh tokens cancelled, push phones removed), can't sign in on the app or website, and can't book with that account, email or phone (403 ACCOUNT_BLOCKED). Bookings, wallet and points stay; the reply's `upcomingBookings` says how many bookings are still coming up. Recorded in the audit log.",
      security: sec,
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      requestBody: { required: true, content: { "application/json": { example: { blocked: true, reason: "Did not show up 3 times" } } } },
      responses: { "200": { description: "`{blocked, upcomingBookings?}`" }, "400": { description: "VALIDATION_ERROR" }, "403": { description: "Super admin only" }, "404": { description: "USER_NOT_FOUND" } },
    },
  },
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
