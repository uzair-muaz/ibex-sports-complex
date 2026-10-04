import type { MigrationCtor, MigrationInterface } from "./types";

/**
 * Register migrations in chronological order (TypeORM-style).
 * Add new migrations at the bottom — never reorder applied ones.
 */
import { CreateAnalyticsDailyAndBackfill1734000000000 } from "../../migrations/1734000000000-CreateAnalyticsDailyAndBackfill";

export const MIGRATIONS: MigrationCtor[] = [
  CreateAnalyticsDailyAndBackfill1734000000000,
];

export function instantiateMigrations(): MigrationInterface[] {
  return MIGRATIONS.map((Ctor) => new Ctor());
}
