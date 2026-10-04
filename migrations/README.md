# Mongo migrations (TypeORM-style)

MongoDB has no built-in migrations. This project uses a small runner that mirrors TypeORM:

| Concept | IBEX |
|--------|------|
| Migration class | `migrations/<timestamp>-Name.ts` implementing `MigrationInterface` |
| Registry | `lib/migrations/registry.ts` (append new migrations at the bottom) |
| Changelog table | Mongo collection `migrations` (`MigrationRecord`) |
| CLI | `npm run migrate` / `migrate:show` / `migrate:revert` |

## Prod / local

```bash
# Preview
npm run migrate:show

# Apply pending (safe to re-run — already-applied are skipped)
npm run migrate

# Undo last only
npm run migrate:revert
```

Requires `MONGODB_URI` in `.env.local` (or the environment).

Analytics freshness does **not** use cron: booking writes refresh the affected day, and opening the analytics dashboard rebuilds recent days if older than 1 hour. Optional manual rebuild: `npm run analytics:rebuild`.

## Adding a migration

1. Create `migrations/<Date.now()>-YourName.ts` with `up` / `down`.
2. Export the class and register it in `lib/migrations/registry.ts`.
3. Run `npm run migrate` against staging, then prod.
