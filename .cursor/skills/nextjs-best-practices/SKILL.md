---
name: nextjs-best-practices
description: >-
  Next.js 16 App Router best practices for IBEX (RSC boundaries, caching,
  server actions, middleware auth, route handlers, bundle hygiene). Use when
  creating or refactoring pages, layouts, middleware, or API routes.
---

# Next.js Best Practices (IBEX)

## Defaults

- App Router only (`app/`)
- Server Components by default; `"use client"` at the **leaves**
- Domain mutations in `app/actions` (`"use server"`)
- HTTP for web+Flutter: `app/api/v1/**` thin handlers

## Auth & middleware

- `middleware.ts` gates `/admin/*`, `/account/*`, `/login` using NextAuth `auth()`
- Layouts add a second client gate for UX; **API still uses `lib/api/guard`**
- Roles: `lib/authz.ts` — never duplicate role string checks ad hoc when helpers exist

## Data

- Do not fetch in Client Components when a server parent or TanStack+`/api/v1` pattern already fits
- Admin lists: TanStack Query + request modules
- After server mutations that affect public pages: `revalidatePath` as needed
- Pass serializable props only across the RSC → client boundary

## Bundles

- Keep mongoose / `connectDB` / Node-only libs out of client components
- Split large admin pages: extract tables, modals, forms
- Prefer `next/dynamic` for rarely opened heavy UI

## Routing

| Path | Audience |
|------|----------|
| `/admin` | Staff login |
| `/admin/*` | Staff app |
| `/login`, `/account/*` | Customers |
| `/booking` | Guests + customers |
| `/api/v1/*` | Web + Flutter |
| `/docs` | OpenAPI UI |

## Checklist

- [ ] Correct server/client split
- [ ] Middleware + API agree on roles
- [ ] No DB in client bundle
- [ ] OpenAPI updated if public API changed
