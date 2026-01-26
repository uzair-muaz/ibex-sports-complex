# Next.js Routing Checklist for `/api/bookings`

## ✅ 1. API Route Location
**Status: CORRECT**
- Location: `app/api/bookings/route.ts` ✅
- No conflicting `pages/api/bookings.ts` ✅
- Using App Router correctly ✅

## ✅ 2. Client vs Server Component
**Status: CORRECT**
- Booking page: `"use client"` directive at top ✅
- Using `api.get()` from `@/lib/api` which handles baseURL correctly ✅
- `getBaseUrl()` returns `window.location.origin` in browser ✅

## ✅ 3. Middleware/Proxy Configuration
**Status: FIXED**
- Proxy matcher: `['/((?!api|_next|favicon.ico).*)']` ✅
- Proxy function early returns for non-admin routes ✅
- API routes explicitly excluded ✅

## ✅ 4. Next.js Config
**Status: CORRECT**
- No `rewrites()` that would conflict ✅
- No `redirects()` that would interfere ✅
- Clean config ✅

## ✅ 5. Runtime Configuration
**Status: CORRECT**
- `export const runtime = 'nodejs'` ✅
- `export const dynamic = 'force-dynamic'` ✅
- Not using Edge runtime ✅

## 🔍 Potential Issues Found

### Issue 1: Proxy Function Still Runs (Even Though It Shouldn't)
The proxy function has an early return, but Next.js might still execute it. Let's add explicit logging.

### Issue 2: Axios Timeout
Current timeout is 15 seconds, but queries timeout at 2-3 seconds. This might cause issues.

### Issue 3: Database Connection
Other APIs work, so DB is fine. But Booking model might have issues.

## Recommendations

1. Add logging to proxy to confirm it's not being called for `/api/bookings`
2. Test the `/api/bookings/test-query` endpoint first
3. Check if the issue is specific to the Booking model query
