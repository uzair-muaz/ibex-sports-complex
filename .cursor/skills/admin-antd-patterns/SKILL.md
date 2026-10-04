---
name: admin-antd-patterns
description: >-
  Builds IBEX admin pages with Ant Design, AdminLayout, light/dark tokens,
  TanStack Query, and loaders. Use when adding or refactoring /admin screens,
  tables, forms, or memberships/support ops.
---

# Admin Ant Design Patterns

## Scope

Ant Design for **admin dashboards only** (`/admin/**`). Public booking/marketing/account keep their existing UI.

## Shell

```tsx
<AdminLayout title="…" description="…" onRefresh={…} isLoading={…} actionButton={…}>
  {children}
</AdminLayout>
```

- Theme: `useAdminTheme()` — do not hardcode black/white chrome
- Colors: `theme.useToken()`
- Auth: only `admin` | `super_admin`; super-admin-only nav for analytics/courts/users

## Data

1. Requests in `lib/tanstack/requests/*.ts` → `/api/v1/admin/...`
2. Keys in `lib/tanstack/keys/`
3. `useQuery` / `useMutation` in the page (or small hooks)
4. Loading: `AdminTableSkeleton` / `AdminCardGridSkeleton` / `AdminPageLoader`

## UI building blocks

- Lists: `Table` + pagination + `Input.Search`
- Create/edit: `Modal` + `Form` + `Form.Item`
- Confirm delete: `Modal.confirm` or `Popconfirm`
- Feedback: `App.useApp()` → `message` / `notification`
- Ops (membership/loyalty/support): `/api/v1/admin/ops` via `bffFetch`

## Page structure

1. Fetch with TanStack
2. Columns as `useMemo` or extracted `*Columns.tsx` if large
3. Modals as sibling components in `components/admin/` when > ~80 lines
4. Keep page under ~300 lines when practical (`component-architecture`)

## Light / dark

- Prefer token colors and Ant components (they theme automatically)
- Avoid `className="bg-black text-white"` in new admin UI
- Custom surfaces: `token.colorBgContainer`, `token.colorBorder`, `token.colorText`

## Checklist

- [ ] Works in light and dark
- [ ] Staff-only API + UI
- [ ] Super-admin gates respected
- [ ] Empty / error / loading states
