/**
 * TypeORM-inspired migration contract for MongoDB.
 * Each file under `migrations/` exports a default class implementing this.
 */
export interface MigrationInterface {
  /** Unique id, typically `Timestamp-Name` matching the filename. */
  name: string;
  up(): Promise<void>;
  down(): Promise<void>;
}

export type MigrationCtor = new () => MigrationInterface;
