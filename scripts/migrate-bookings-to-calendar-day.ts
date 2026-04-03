// Load environment variables from .env.local BEFORE any other imports
// eslint-disable-next-line @typescript-eslint/no-var-requires
require("dotenv").config({
  path: require("path").resolve(process.cwd(), ".env.local"),
});

import connectDB from "../lib/mongodb";
import Booking from "../models/Booking";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function addDaysUTC(dateStr: string, days: number): string {
  // dateStr is YYYY-MM-DD (stored without timezone)
  const [y, m, d] = dateStr.split("-").map((x) => Number(x));
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`;
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const dryRun = args.has("--dry");

  await connectDB();

  const query = {
    // Old semantics: times 0:00–3:30 AM were stored in the previous business day.
    // New semantics: those should belong to the next calendar day.
    startTime: { $lt: 4 },
  };

  const count = await Booking.countDocuments(query);
  console.log(`Bookings to migrate: ${count}`);

  if (count === 0) {
    process.exit(0);
  }

  const bookings = await Booking.find(query).select({ _id: 1, date: 1, startTime: 1 });

  if (dryRun) {
    console.log("Dry run enabled (--dry). No updates applied.");
    process.exit(0);
  }

  const bulkOps = bookings.map((b: any) => ({
    updateOne: {
      filter: { _id: b._id },
      update: { $set: { date: addDaysUTC(b.date, 1) } },
    },
  }));

  const result = await Booking.bulkWrite(bulkOps);
  console.log("Migration complete.");
  // eslint-disable-next-line no-console
  console.log(`Matched: ${result.matchedCount}, Modified: ${result.modifiedCount}`);
  process.exit(0);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Migration failed:", err);
  process.exit(1);
});

