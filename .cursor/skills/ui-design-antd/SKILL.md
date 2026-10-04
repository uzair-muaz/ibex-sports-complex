---
name: ui-design-antd
description: >-
  Designs IBEX admin dashboard UI with Ant Design (light/dark). Use for /admin
  screens only — not public marketing or booking. Use when building admin forms,
  tables, themes, or dashboards.
---

# UI Design — Ant Design (Admin Dashboards Only)

## Scope

- **In scope:** `/admin/**`, `components/admin/**`
- **Out of scope:** public landing, `/booking`, customer `/account` (keep existing public UI)

## Admin theme

- Provider: `components/admin/AdminAntdProvider.tsx`
- Hook: `useAdminTheme()` → `light` | `dark`
- Prefer `theme.useToken()` and CSS vars (`var(--ant-color-text)`, etc.)
- Persist: `localStorage` key `ibex-admin-theme`

## Building blocks

`AdminLayout`, Ant `Table` / `Form` / `Modal` / `Card`, `@ant-design/icons`, loaders in `components/admin/loaders`

## Anti-patterns

- Introducing Ant Design on public marketing/booking pages without an explicit ask
- Hardcoded `bg-black` / `text-white` in admin (breaks light mode)
