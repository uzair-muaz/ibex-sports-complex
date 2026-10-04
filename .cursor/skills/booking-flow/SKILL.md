---
name: booking-flow
description: >-
  Implements or debugs IBEX court booking (guest + logged-in), availability,
  checkout, loyalty redeem, membership hours, claim-by-email, and cancel window.
  Use when working on /booking, Booking* components, createBooking, or account
  bookings.
---

# Booking Flow

## Product rules

- Guests may book without login (`POST /api/v1/bookings` or server `createBooking`)
- Logged-in customers get `userId` linked from auth (cookie/Bearer) — never from body
- Staff creating bookings via admin should **not** link as customer `userId`
- Claim: matching `userEmail` + empty `userId` → link on profile/claim endpoint
- Cancel: customer needs ≥ `CUSTOMER_CANCEL_MIN_HOURS_BEFORE_START` (4h) before start
- Loyalty / membership redeem: require customer auth; rules in `lib/loyalty-rules.ts`, `lib/membership-rules.ts`

## Code map

| Concern | Location |
|---------|----------|
| Create / extend / admin CRUD | `app/actions/bookings.ts` |
| My bookings / cancel | `app/actions/customer-bookings.ts` |
| Claim | `app/actions/account.ts` → `claimBookingsByEmail` |
| Public UI | `app/booking/**`, `components/booking/**` |
| API | `app/api/v1/bookings`, `app/api/v1/account/bookings/**` |
| Client requests | `lib/tanstack/requests/account.requests.ts`, admin `bookings.requests.ts` |

## UI direction

- New booking UI: **Ant Design** (`ui-design-antd`)
- Prefer splitting: date picker, slots grid, checkout, success (see `component-architecture`)

## Checklist

- [ ] Guest path still works without token
- [ ] Authenticated path sets actor via guard/`optionalApiUser`
- [ ] Membership/loyalty gated to customers
- [ ] Conflict detection still uses date ±1 for overnight spans
- [ ] OpenAPI updated if request/response shape changes
