// Load environment variables from .env.local BEFORE any other imports
// Using require to ensure synchronous execution before module evaluation
require("dotenv").config({
  path: require("path").resolve(process.cwd(), ".env.local"),
});

// Now import modules that depend on environment variables
import connectDB from "../lib/mongodb";
import User from "../models/User";
import Court from "../models/Court";
import bcrypt from "bcryptjs";

async function seed() {
  try {
    await connectDB();
    console.log("✅ Connected to MongoDB");

    // Clear existing data (optional - comment out if you want to keep existing data)
    // await User.deleteMany({});
    // await Court.deleteMany({});
    // console.log('🗑️  Cleared existing data');

    // Create Super Admin
    const adminEmail = process.env.ADMIN_EMAIL || "admin@ibex.com";
    const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
    const adminName = process.env.ADMIN_NAME || "Super Admin";

    const existingAdmin = await User.findOne({ email: adminEmail });
    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      await User.create({
        email: adminEmail,
        password: hashedPassword,
        name: adminName,
        role: "super_admin",
      });
      console.log(`✅ Created Super Admin: ${adminEmail}`);
    } else {
      console.log(`ℹ️  Super Admin already exists: ${adminEmail}`);
    }

    // Create Courts - Only prices stored in DB, all other data is static/hardcoded
    // Images and descriptions are hardcoded in components, not stored in DB
    const courts = [
      {
        name: "Padel Court Alpha",
        type: "PADEL" as const,
        image: "", // Images are hardcoded, not stored in DB
        description: "Professional panoramic glass court with Mondo turf.", // Static data
        pricePerHour: 5000, // PKR - Only this is dynamic from DB
        isActive: true,
      },
      {
        name: "Padel Court Beta",
        type: "PADEL" as const,
        image: "", // Images are hardcoded, not stored in DB
        description: "Outdoor premium court with advanced shock absorption.", // Static data
        pricePerHour: 5000, // PKR - Only this is dynamic from DB
        isActive: true,
      },
      {
        name: "The Oval Net",
        type: "CRICKET" as const,
        image: "", // Images are hardcoded, not stored in DB
        description: "Full-length automated bowling lane.", // Static data
        pricePerHour: 8000, // PKR - Only this is dynamic from DB
        isActive: true,
      },
      {
        name: "Lords Practice Area",
        type: "CRICKET" as const,
        image: "", // Images are hardcoded, not stored in DB
        description: "Traditional turf net for spin practice.", // Static data
        pricePerHour: 8000, // PKR - Only this is dynamic from DB
        isActive: true,
      },
      {
        name: "Pickleball Court Prime",
        type: "PICKLEBALL" as const,
        image: "", // Images are hardcoded, not stored in DB
        description:
          "Premium indoor pickleball court with professional-grade surface.", // Static data
        pricePerHour: 4000, // PKR - Only this is dynamic from DB
        isActive: true,
      },
      {
        name: "Pickleball Court Elite",
        type: "PICKLEBALL" as const,
        image: "", // Images are hardcoded, not stored in DB
        description: "Outdoor pickleball court with weather-resistant surface.", // Static data
        pricePerHour: 0, // Free court - Only this is dynamic from DB
        isActive: true,
      },
    ];

    let createdCount = 0;
    for (const courtData of courts) {
      const existingCourt = await Court.findOne({ name: courtData.name });
      if (!existingCourt) {
        await Court.create(courtData);
        createdCount++;
        console.log(`✅ Created court: ${courtData.name}`);
      } else {
        console.log(`ℹ️  Court already exists: ${courtData.name}`);
      }
    }

    console.log(`\n🎉 Seed completed!`);
    console.log(`   - Super Admin: ${adminEmail} / ${adminPassword}`);
    console.log(`   - Courts created: ${createdCount}/${courts.length}`);
    console.log(`\n📝 Note: Default admin credentials are in .env file`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Seed error:", error);
    process.exit(1);
  }
}

seed();
