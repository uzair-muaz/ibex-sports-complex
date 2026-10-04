---
name: migrate-shadcn-to-antd
description: >-
  Optional migration notes when converting an admin screen leftover to Ant
  Design. Do not use to rewrite public booking/marketing to antd — admin
  dashboards only.
---

# Admin-only UI migration

Ant Design belongs on **admin dashboards**. Public site may keep Tailwind / existing components.

When touching an admin file that still imports `@/components/ui/*`, replace with Ant Design equivalents (`Button`, `Modal`, `QRCode`, etc.).
