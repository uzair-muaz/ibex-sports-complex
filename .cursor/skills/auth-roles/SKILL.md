---
name: auth-roles
description: >-
  Enforces staff vs customer authorization across middleware, layouts, NextAuth,
  and /api/v1 guards. Use when touching login, roles, redirects, or protecting
  admin/account/API routes.
---

# Auth & Roles

## Roles

| Role | Web home | APIs |
|------|----------|------|
| `user` | `/account` | Customer `/api/v1/account/*`, public bookings |
| `admin` | `/admin/bookings` | `/api/v1/admin/*` |
| `super_admin` | same + analytics/courts/users | same |

Helpers: `lib/authz.ts` → `isStaffRole`, `isCustomerRole`, `isSuperAdminRole`.

## Entry points

- Staff credentials: `/admin` (credentials provider rejects non-staff)
- Customers: `/login` (Google); never elevates role via Google
- Flutter: `POST /api/v1/auth/google` → Bearer JWT

## Layers (all required)

1. **`middleware.ts`** — redirect wrong audience early
2. **Layouts** — admin/account client gates for UX
3. **`lib/api/guard.ts`** — `requireApiCustomer` / `requireApiAdmin`
4. **Actions** — `actorUserId` for Bearer; still validate ownership

## Rules

- Staff must not use customer account UI (redirect to admin)
- Customers must not open `/admin/*` (redirect to account)
- Customer API returns 403 for staff; admin API 401/403 for customers
- Super-admin-only menu items stay gated in `AdminLayout` + server actions

## Checklist

- [ ] Used `lib/authz` helpers
- [ ] Middleware matcher covers the path
- [ ] API guard matches UI audience
- [ ] Google path cannot grant admin
