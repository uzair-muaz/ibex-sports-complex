/**
 * Phase 12: memberships now hold hours PER SPORT. Old memberships on staging
 * have one shared pool of hours and can't be split automatically (the venue
 * decides the split), and staging memberships are test data. So this script:
 *
 *   - lists plans that still have no hours per sport (fix them in Admin → Memberships → Plans);
 *   - lists active memberships that still use the old shared pool;
 *   - with --apply, ends those old memberships (status "cancelled"). Staff can
 *     then press Activate again with hours per sport. Their bookings are kept.
 *
 *   npx tsx scripts/migrate-membership-per-sport.ts                       # look only (dry run)
 *   npx tsx scripts/migrate-membership-per-sport.ts --apply --db=<name>   # really end them
 *
 * --db must match the database name in MONGODB_URI. NOT an automatic
 * migration: never run with --apply on the live database without the venue's OK.
 */
import path from "path";
import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDB from "../lib/mongodb";
import MembershipPlan from "../models/MembershipPlan";
import UserMembership from "../models/UserMembership";
import "../models/User";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function main() {
  const apply = process.argv.includes("--apply");
  const dbArg = process.argv.find((a) => a.startsWith("--db="))?.slice(5);

  await connectDB();
  const dbName = mongoose.connection.db?.databaseName;
  console.log(`Database: ${dbName}`);

  const plans = await MembershipPlan.find({ "hoursBySport.0": { $exists: false } }).select("name hours").lean();
  console.log(`${plans.length} plan(s) without hours per sport (hidden from customers until set):`);
  for (const p of plans) console.log(`  - ${p.name} (old shared pool: ${p.hours}h)`);

  const old = await UserMembership.find({ status: "active", "hoursBySport.0": { $exists: false } })
    .populate("userId", "email")
    .populate("planId", "name")
    .lean();
  console.log(`${old.length} active membership(s) still on the old shared pool:`);
  for (const m of old) {
    const email = (m.userId as { email?: string } | null)?.email ?? "?";
    const plan = (m.planId as { name?: string } | null)?.name ?? "?";
    console.log(`  - ${email}: ${plan}, ${m.hoursRemaining}h left, until ${new Date(m.validUntil).toISOString().slice(0, 10)}`);
  }

  if (!apply) {
    console.log("Dry run: nothing changed. Add --apply --db=<database name> to end the old memberships.");
    return;
  }
  if (!dbArg || dbArg !== dbName) {
    throw new Error(`Refusing: --db must be exactly "${dbName}".`);
  }
  const res = await UserMembership.updateMany(
    { _id: { $in: old.map((m) => m._id) }, status: "active", "hoursBySport.0": { $exists: false } },
    { $set: { status: "cancelled" } },
  );
  console.log(`Ended ${res.modifiedCount} old membership(s). Re-activate them in Admin → Memberships with hours per sport.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
