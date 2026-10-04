import type { MigrationInterface } from "@/lib/migrations/types";
import AnalyticsDaily from "@/models/AnalyticsDaily";
import { rebuildAnalyticsDaily } from "@/lib/analytics/daily-rollup";

/**
 * Creates analytics_daily (via model ensureIndexes) and backfills
 * one document per distinct booking date from existing Booking rows.
 *
 * Prod: `npm run migrate` after deploy.
 * Revert drops the rollup collection (raw bookings are untouched).
 */
export class CreateAnalyticsDailyAndBackfill1734000000000
  implements MigrationInterface
{
  name = "1734000000000-CreateAnalyticsDailyAndBackfill";

  async up(): Promise<void> {
    await AnalyticsDaily.createCollection();
    await AnalyticsDaily.syncIndexes();
    const result = await rebuildAnalyticsDaily();
    console.log(
      `  Backfilled ${result.upserted} analytics_daily row(s) across ${result.dates.length} date(s)`,
    );
  }

  async down(): Promise<void> {
    await AnalyticsDaily.collection.drop().catch((err: { codeName?: string }) => {
      if (err?.codeName !== "NamespaceNotFound") throw err;
    });
  }
}

export default CreateAnalyticsDailyAndBackfill1734000000000;
