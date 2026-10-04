---
name: web-best-practices
description: >-
  Applies general web engineering best practices (a11y, performance, security
  basics, progressive enhancement, responsive layout). Use when building pages,
  forms, dashboards, or reviewing frontend quality beyond framework specifics.
---

# Web Best Practices

## Security (browser)

- XSS: never `dangerouslySetInnerHTML` with user content; Ant Design Text is fine for plain strings
- CSRF: cookie session same-site; mutating APIs require auth; do not reflect tokens in URLs
- Sensitive data: no secrets in client bundles; use env only on server
- Auth UX is not auth: always enforce on middleware + server/API

## Accessibility

- Buttons/links are real controls (not clickable `div`s)
- Icon-only buttons need `aria-label` (theme toggle, menu collapse)
- Forms: labels associated with inputs (Ant Form `label` / `Form.Item`)
- Focus visible; modals trap focus (Ant Modal does this)
- Color is not the only status signal (pair with text/icons)

## Performance

- Prefer route-level code splitting; lazy-load heavy admin panels with `next/dynamic` when needed
- Images: `next/image` with allowed hosts; sensible sizes
- Avoid layout thrash; use Ant Design Table pagination instead of rendering huge DOM lists
- Debounce search inputs on admin lists

## Responsive

- Admin: sidebar collapses; test mobile drawer
- Public: touch-friendly targets, no horizontal scroll traps
- Tables: horizontal scroll or card layouts on small screens

## UX

- Loading, empty, and error states for every async view
- Destructive actions need confirm
- Persist user preferences (theme) in `localStorage` when client-only

## Checklist

- [ ] Works keyboard-only for primary flows
- [ ] Auth enforced server-side
- [ ] Loading/empty/error covered
- [ ] No hardcoded secrets
- [ ] Readable in light and dark (admin)
