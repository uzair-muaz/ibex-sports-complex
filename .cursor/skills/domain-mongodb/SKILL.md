---
name: domain-mongodb
description: >-
  Extends IBEX domain models and server actions (bookings, loyalty, membership,
  support, users) with Mongoose safely. Use when changing schemas, writing
  actions, seeding plans/rules, or fixing booking/account linking logic.
---

# Domain & MongoDB

## Models

- Live under `models/*.ts` (Mongoose)
- Shared TS shapes also appear in `types/`
- Booking ↔ account: `userId` on bookings; claim guest rows by matching `userEmail` when `userId` empty

## Actions

- `"use server"` modules in `app/actions/`
- For anything reachable from `/api/v1` with Bearer auth, accept **`actorUserId`** (or options) instead of relying only on `auth()`
- Keep business rules in `lib/*-rules.ts` (loyalty, membership) — change rules in one place

## Safety

- Always `connectDB()` before queries
- Validate inputs at the action boundary
- Prefer `revalidatePath` for account pages after mutations
- Do not expose internal mongoose docs to clients without `JSON.parse(JSON.stringify(...))` or explicit DTOs
- Schema / data changes that need prod backfill: add a file under `migrations/` and register it in `lib/migrations/registry.ts`, then `npm run migrate` (TypeORM-style changelog in `migrations` collection)

## Loyalty / membership / support

- Read existing rules files before changing point rates, cancel windows, or hour packages
- Admin adjustments go through admin actions + `/api/v1/admin/ops`
