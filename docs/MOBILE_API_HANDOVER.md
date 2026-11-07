# Mobile app API: hand-over for review

All of this work is on local branches stacked on `staging` (`0419623`). Nothing is pushed,
merged or deployed. Each phase is one commit on its own branch, so it can be reviewed one
at a time, oldest first:

| Phase | Branch | What it adds |
|---|---|---|
| 1 | `mobile-api/phase-1-auth` | Email login, Apple, refresh tokens, logout, change password |
| 2 | `mobile-api/phase-2-catalog` | Profile, venue, sports, booking policy, court cards |
| 3 | `mobile-api/phase-3-availability` | Free times for one court |
| 4 | `mobile-api/phase-4-quote` | Price check (quote); points and advance settings |
| 5 | `mobile-api/phase-5-booking` | Make a booking (guest or signed in), slot locks |
| 6 | `mobile-api/phase-6-my-bookings` | My bookings list and details |
| 7 | `mobile-api/phase-7-payments` | Bank transfer, payment screenshots, staff verify / reject |
| 8 | `mobile-api/phase-8-guest-bookings` | Guest bookings with a private code |
| 9 | `mobile-api/phase-9-cancel` | Cancel from the app; money goes to the wallet |
| 10 | `mobile-api/phase-10-loyalty` | Points follow App Settings (web and app) |
| 11 | `mobile-api/phase-11-wallet` | Wallet balance, history, spend; staff wallet tools |
| 12 | `mobile-api/phase-12-membership` | Membership hours per sport, plans, paying with hours |
| 13 | `mobile-api/phase-13-notifications` | In-app, push and email messages; 2-hour reminder job |
| 14 | `mobile-api/phase-14-preferences` | Player preferences, support FAQs |
| 15 | `mobile-api/phase-15-release-prep` | Security fixes, Swagger servers, test-customer script, this note |

Swagger: `/docs` (data at `/api/v1/openapi`). Unit tests: `npm test`.

## Before release (needs the developer)

**Settings and environment variables** (names only; see `.env.example`):
- `CRON_SECRET` (16+ characters), then call `GET /api/v1/jobs/reminders` with
  `Authorization: Bearer <CRON_SECRET>` every 10–15 minutes (Vercel Cron on live, cron/PM2 on staging).
- Push: `FIREBASE_SERVICE_ACCOUNT` and `NOTIFY_SEND_PUSH=true`.
- Email: `RESEND_API_KEY` and `NOTIFY_SEND_EMAIL=true`. Both switches stay off on laptops and staging.
- `APPLE_BUNDLE_ID`, `APPLE_SERVICE_ID`, `GOOGLE_ANDROID_CLIENT_ID`, `GOOGLE_IOS_CLIENT_ID`; payment screenshot storage: only `FILE_STORAGE=local` exists today (fine on the staging server, not on Vercel); S3 still has to be added. Screenshots must stay private.
- nginx on staging should pass the real visitor IP (`X-Real-IP`) so rate limits work per person.

**Data**
- Set hours per sport on the 4 old membership plans (Admin → Memberships → Plans); until then they're hidden.
- `scripts/migrate-membership-per-sport.ts` (dry run first) for old shared-pool memberships.
- `scripts/reset-loyalty-points.ts` at release (staging points are test data).
- `scripts/seed-app-test-customer.ts` gives the mobile team a test customer with sample data
  (test database only; dry run unless `--apply --db=<name>`). Share the login privately.
- Rotate the secrets that were shared during planning.

**Known gaps (not built, on purpose or for later)**
- Staff cancelling a booking from admin doesn't refund points or wallet money (customer cancel does).
- Notifications are sent inline; a queue could come later.
- "Court availability" and "newsletter" switches are saved but nothing sends those messages yet.
- Part B of the requirements (online payment, split payment, holds, QR check-in, invoices) waits for a gateway.

## Security fixes in phase 15

- `lib/loyalty.ts` and `lib/membership.ts` were `"use server"` files, so every export
  (give points, activate a membership) could become an action callable from a browser with
  no sign-in. They are now plain server helpers; a unit test stops any `lib/` file going back.
- `getBookingsByDate` (unused) returned every booking for a day with contact details to
  anyone. It is now staff-only.
- The public entry-pass page (`/booking/verify/[id]`) and feedback page (`/feedback/[id]`)
  received the whole booking. They now get only the fields they show. They still show the
  customer's name, email and phone to anyone with the link, as before: worth deciding
  whether to mask them.
- Still worth checking on the live site (`main`): `/api/test-sms` and the server actions
  without checks (see the planning notes).
