import connectDB from "@/lib/mongodb";
import MigrationRecord from "@/models/MigrationRecord";
import { instantiateMigrations } from "@/lib/migrations/registry";
import type { MigrationInterface } from "@/lib/migrations/types";

function parseTimestamp(name: string): number {
  const match = /^(\d+)/.exec(name);
  if (!match) {
    throw new Error(`Migration name must start with a timestamp: ${name}`);
  }
  return Number(match[1]);
}

export async function listMigrations() {
  await connectDB();
  const applied = await MigrationRecord.find().sort({ timestamp: 1 }).lean();
  const appliedNames = new Set(applied.map((r) => r.name));
  const all = instantiateMigrations();

  return all.map((m) => ({
    name: m.name,
    timestamp: parseTimestamp(m.name),
    status: appliedNames.has(m.name) ? ("applied" as const) : ("pending" as const),
    executedAt: applied.find((r) => r.name === m.name)?.executedAt ?? null,
  }));
}

export async function runPendingMigrations(): Promise<{
  ran: string[];
}> {
  await connectDB();
  const applied = await MigrationRecord.find().lean();
  const appliedNames = new Set(applied.map((r) => r.name));
  const pending = instantiateMigrations().filter((m) => !appliedNames.has(m.name));
  const ran: string[] = [];

  for (const migration of pending) {
    console.log(`→ Running migration: ${migration.name}`);
    await migration.up();
    await MigrationRecord.create({
      timestamp: parseTimestamp(migration.name),
      name: migration.name,
      executedAt: new Date(),
    });
    ran.push(migration.name);
    console.log(`✓ Applied: ${migration.name}`);
  }

  if (ran.length === 0) {
    console.log("No pending migrations.");
  }

  return { ran };
}

export async function revertLastMigration(): Promise<{
  reverted: string | null;
}> {
  await connectDB();
  const last = await MigrationRecord.findOne().sort({ timestamp: -1 });
  if (!last) {
    console.log("No migrations to revert.");
    return { reverted: null };
  }

  const migration = instantiateMigrations().find((m) => m.name === last.name);
  if (!migration) {
    throw new Error(
      `Migration ${last.name} is in the DB but not in the registry. Cannot revert safely.`,
    );
  }

  console.log(`→ Reverting migration: ${migration.name}`);
  await migration.down();
  await MigrationRecord.deleteOne({ _id: last._id });
  console.log(`✓ Reverted: ${migration.name}`);
  return { reverted: migration.name };
}

export type { MigrationInterface };
