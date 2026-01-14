// Load environment variables from .env.local BEFORE any other imports
require("dotenv").config({
  path: require("path").resolve(process.cwd(), ".env.local"),
});

import connectDB from "../lib/mongodb";
import Booking from "../models/Booking";
import Court from "../models/Court";

async function getFeedbackUrl() {
  try {
    await connectDB();
    console.log("✅ Connected to MongoDB");

    // Get the most recent booking
    const booking = await Booking.findOne()
      .sort({ createdAt: -1 });

    if (!booking) {
      console.log("❌ No bookings found in database.");
      console.log("💡 Create a booking first at http://localhost:3000/booking");
      process.exit(1);
    }

    const bookingId = booking._id.toString();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const feedbackUrl = `${baseUrl}/feedback/${bookingId}`;

    console.log("\n📋 Booking Details:");
    console.log(`   Booking ID: ${bookingId}`);
    console.log(`   User: ${booking.userName} (${booking.userEmail})`);
    console.log(`   Court Type: ${(booking as any).courtType || 'N/A'}`);
    console.log(`   Date: ${booking.date}`);
    console.log(`   Time: ${booking.startTime}:00 - ${booking.startTime + booking.duration}:00`);
    console.log(`   Status: ${booking.status}`);
    
    console.log("\n🔗 Feedback URL:");
    console.log(`   ${feedbackUrl}`);
    console.log("\n💡 Copy the URL above to test the feedback form");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

getFeedbackUrl();
