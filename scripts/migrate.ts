/**
 * TypeORM-style Mongo migration CLI.
 *
 *   npm run migrate          # run pending
 *   npm run migrate:show     # list status
 *   npm run migrate:revert   # revert last
 *
 * Uses MONGODB_URI from .env.local (or process env).
 */
require("dotenv").config({
  path: require("path").resolve(process.cwd(), ".env.local"),
});

import {
  listMigrations,
  revertLastMigration,
  runPendingMigrations,
} from "../lib/migrations/runner";

async function main() {
  const cmd = process.argv[2] || "run";

  if (cmd === "show" || cmd === "status") {
    const rows = await listMigrations();
    if (rows.length === 0) {
      console.log("No migrations registered.");
      return;
    }
    for (const row of rows) {
      const mark = row.status === "applied" ? "[x]" : "[ ]";
      const when = row.executedAt
        ? ` @ ${new Date(row.executedAt).toISOString()}`
        : "";
      console.log(`${mark} ${row.name}${when}`);
    }
    return;
  }

  if (cmd === "revert" || cmd === "down") {
    await revertLastMigration();
    return;
  }

  if (cmd === "run" || cmd === "up") {
    await runPendingMigrations();
    return;
  }

  console.error(`Unknown command: ${cmd}`);
  console.error("Usage: tsx scripts/migrate.ts [run|show|revert]");
  process.exitCode = 1;
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
