// Load environment variables from .env.local BEFORE any other imports
// Using require to ensure synchronous execution before module evaluation
require("dotenv").config({
  path: require("path").resolve(process.cwd(), ".env.local"),
});

import connectDB from "../lib/mongodb";
import Booking from "../models/Booking";

async function migrateBookingSerialNumbers() {
  try {
    await connectDB();
    console.log("✅ Connected to MongoDB");

    const total = await Booking.countDocuments();
    if (total === 0) {
      console.log("ℹ️  No bookings found in database. Nothing to migrate.");
      process.exit(0);
    }

    console.log(`ℹ️  Found ${total} bookings. Fetching in createdAt order...`);

    // Oldest first so serialNumber reflects chronological order
    const bookings = await Booking.find().sort({ createdAt: 1 });

    const bulkOps = bookings.map((booking: any, index: number) => ({
      updateOne: {
        filter: { _id: booking._id },
        update: {
          $set: {
            serialNumber: index + 1,
          },
        },
      },
    }));

    if (bulkOps.length === 0) {
      console.log("ℹ️  No bookings to update.");
      process.exit(0);
    }

    console.log("⚙️  Updating serial numbers in bulk...");
    const result = await Booking.bulkWrite(bulkOps);

    console.log("✅ Migration complete.");
    console.log(`   - Matched: ${result.matchedCount}`);
    console.log(`   - Modified: ${result.modifiedCount}`);
    console.log("\n💡 Bookings now have incremental serialNumber starting from 1 (oldest) upwards.");

    process.exit(0);
  } catch (error) {
    console.error("❌ Migration error:", error);
    process.exit(1);
  }
}

migrateBookingSerialNumbers();

