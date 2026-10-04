---
name: component-architecture
description: >-
  Splits oversized React/Next pages into small components, hooks, and request
  modules following IBEX folder conventions. Use when a file is large, mixing
  UI with data, duplicating markup, or the user asks to refactor, modularize,
  or code-split into smaller chunks/components.
---

# Component Architecture & Splitting

## Target shape

```
page.tsx                 → routing + data boundary (prefer server)
  FeatureClient.tsx      → orchestration / local state
    SubComponent.tsx     → presentational
    hooks/useFeature.ts  → reusable logic
lib/tanstack/requests/   → HTTP to /api/v1
lib/tanstack/keys/       → query keys
app/actions/             → server domain (not UI)
```

## When to split

Split when a file has **any** of:

- > ~200–250 lines mixing UI + fetch + helpers
- Multiple modals/sections in one component
- Logic reusable across pages (extract hook or request)
- Server-only and client-only code tangled

## How to split (order)

1. **Extract pure helpers** → `lib/` or colocated `utils.ts`
2. **Extract data access** → `lib/tanstack/requests/*.ts` (+ keys)
3. **Extract hooks** → `components/<domain>/hooks/` (e.g. booking)
4. **Extract presentational pieces** → same domain folder
5. **Keep orchestrator thin** — wire props/events only

## Naming

- Domain folders: `components/booking/`, `components/admin/`, `components/sections/`
- Prefer Ant Design building blocks; extract wrappers only when reused 2+ times
- Hooks: `useBookingAvailability`, `useBusinessTime`, `useAdminTheme`
- Do not create deep `utils/helpers/misc` dumping grounds
- Do not grow `components/ui` (legacy shadcn) — migrate toward antd when touching

## Props discipline

- Pass the minimum props needed; avoid prop-drilling through 4+ layers — lift state or use a small context only if already a pattern
- Keep types next to usage or in `types/` when shared across server/client
- Serialize dates/ObjectIds at the action/API boundary before sending to client

## Anti-patterns

- One mega `page.tsx` with inline fetch + table + forms + modals
- Duplicating `fetch('/api/...')` in pages — use `bffFetch` + request modules
- Copy-pasting Ant Design column defs — extract column builders when reused
- `"use client"` on an entire route tree when only one leaf needs it

## Refactor checklist

- [ ] Public vs admin toolkit unchanged
- [ ] Behavior/tests mentally verified (same props/events)
- [ ] No new circular imports
- [ ] Exports are intentional (avoid barrel-file spam unless folder already has `index.ts`)
