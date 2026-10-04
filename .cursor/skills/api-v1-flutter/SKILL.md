---
name: api-v1-flutter
description: >-
  Maintains the shared /api/v1 HTTP API for Next.js web and the Flutter mobile
  app (Google ID token → Bearer JWT, CORS, actorUserId). Use when adding or
  changing API routes, OpenAPI/Swagger, mobile auth, or Flutter client
  integration.
---

# API v1 + Flutter Mobile

## Architecture

```
Flutter app ──Bearer JWT──┐
Web (NextAuth cookie) ────┼──► /api/v1/* ──► app/actions/* ──► MongoDB
Swagger /docs ────────────┘
```

- Spec: `GET /api/v1/openapi` · UI: `/docs`
- Dual auth: `lib/api/guard.ts` (`resolveApiUser` — Bearer preferred, else cookie)
- Mobile token: `POST /api/v1/auth/google` with `{ idToken }` from **Google Sign-In (Flutter)**
- Token mint/verify: `lib/api/mobile-jwt.ts` (audience `ibex-mobile`)
- **Umbrella:** every product HTTP endpoint goes under `/api/v1/**`. Do not create `/api/foo` outside v1. Exception: NextAuth `/api/auth/[...nextauth]`. `/api/bff/*` is rewrite-only → v1.

## Flutter expectations

1. Use Google Sign-In to obtain an **ID token**.
2. Exchange via `POST /api/v1/auth/google` → store `accessToken` securely (e.g. `flutter_secure_storage`).
3. Call APIs with `Authorization: Bearer <accessToken>`.
4. Configure Google Cloud OAuth clients for iOS/Android; set `GOOGLE_IOS_CLIENT_ID` / `GOOGLE_ANDROID_CLIENT_ID` (and web `GOOGLE_CLIENT_ID`) so `aud` checks pass.
5. Set `API_CORS_ORIGINS` if any webview/tooling needs browser CORS (native Flutter HTTP usually does not need CORS).

## Implementing a new endpoint

1. Put domain logic in `app/actions/*` with optional `actorUserId` (or options object) so Bearer works without a cookie session.
2. Add thin `app/api/v1/.../route.ts`:
   - `requireApiCustomer` / `requireApiAdmin` / `optionalApiUser`
   - Pass `gate.user.id` into actions
   - Return `apiOk` / `apiError` with `request` for CORS
   - Export `OPTIONS` → `apiOptions`
3. Update `lib/api/openapi.ts` paths/schemas.
4. Wire web clients through `lib/tanstack/requests/*` + `bffFetch` (`/api/v1/...`).
5. Never accept `userId` from the client body for ownership; link bookings only from authenticated identity.

## Booking create (guest + auth)

- Guests: `POST /api/v1/bookings` without auth
- Logged-in customers: pass actor via `optionalApiUser` → `createBooking(..., { actorUserId, actorRole })`
- Membership/loyalty redeem requires customer auth

## Security checklist

- [ ] Admin routes reject role `user`
- [ ] Customer routes reject admin roles
- [ ] Google upsert never elevates to admin
- [ ] OpenAPI documents auth requirements

## Extra

- Flutter package/auth flow details: [reference.md](reference.md)
