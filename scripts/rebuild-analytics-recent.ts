/**
 * Rebuild AnalyticsDaily for the last N days (inclusive of today, UTC date keys).
 * Usage: tsx scripts/rebuild-analytics-recent.ts [days=14]
 */
require("dotenv").config({
  path: require("path").resolve(process.cwd(), ".env.local"),
});

import { rebuildAnalyticsDaily } from "../lib/analytics/daily-rollup";

async function main() {
  const n = Math.max(0, Number(process.argv[2] || 14));
  const dates: string[] = [];
  const now = new Date();
  for (let i = 0; i <= n; i++) {
    const d = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i),
    );
    dates.push(d.toISOString().slice(0, 10));
  }
  const result = await rebuildAnalyticsDaily(dates);
  console.log(
    `Rebuilt ${result.upserted} day(s): ${result.dates[result.dates.length - 1]} → ${result.dates[0]}`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
