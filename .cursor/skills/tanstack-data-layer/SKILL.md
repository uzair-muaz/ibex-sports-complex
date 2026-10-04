---
name: tanstack-data-layer
description: >-
  Adds or updates TanStack Query keys, request modules, and hooks using
  bffFetch against /api/v1. Use when wiring admin/account UI data fetching,
  mutations, cache invalidation, or replacing ad-hoc fetch calls.
---

# TanStack Query Data Layer

## Layout

```
lib/tanstack/
  keys/          → query key factories
  requests/      → pure async functions (bffFetch → /api/v1)
  hooks/         → useQuery / useMutation wrappers (when present)
  query-client.ts
components/providers/QueryProvider.tsx
```

## Rules

1. **Requests** talk only to `/api/v1/...` via `bffFetch` (`credentials: "include"` for web).
2. **Keys** live in `lib/tanstack/keys/*` and are imported into hooks/pages — no stringly keys scattered in JSX.
3. Prefer existing patterns in `bookings.requests.ts`, `account.requests.ts`, etc.
4. Mutations should invalidate the related query keys on success.
5. Admin pages: show `AdminTableSkeleton` / loaders while `isPending`.
6. Do not call server actions directly from admin list pages when a BFF/API request module already exists — keep one path for web + future tooling.

## Adding a resource

1. Add/extend `*.requests.ts` functions
2. Add key factory entries
3. Add hook or use `useQuery`/`useMutation` in the page with those keys
4. Ensure the `/api/v1` route exists and is documented in OpenAPI if public/mobile-facing

## Error handling

- `bffFetch` throws `Error` with server `error` message — surface with Ant `message.error` or sonner on public UI
- Do not swallow errors silently
