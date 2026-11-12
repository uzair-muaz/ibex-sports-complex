/**
 * Reset everyone's reward points to 0 (decision: points earned on staging are
 * test data). Each reset is recorded as an "adjust" entry, so history shows it.
 *
 *   npx tsx scripts/reset-loyalty-points.ts                       # look only (dry run)
 *   npx tsx scripts/reset-loyalty-points.ts --apply --db=<name>   # really reset
 *
 * --db must match the database name in MONGODB_URI, so it can't run on the
 * wrong database by accident. NOT an automatic migration on purpose: never run
 * it on the live database once real customers have points.
 */
import path from "path";
import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDB from "../lib/mongodb";
import LoyaltyAccount from "../models/LoyaltyAccount";
import LoyaltyTransaction from "../models/LoyaltyTransaction";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function main() {
  const apply = process.argv.includes("--apply");
  const dbArg = process.argv.find((a) => a.startsWith("--db="))?.slice(5);

  await connectDB();
  const dbName = mongoose.connection.db?.databaseName;
  console.log(`Database: ${dbName}`);

  const accounts = await LoyaltyAccount.find({ balance: { $gt: 0 } }).select("userId balance").lean();
  const total = accounts.reduce((s, a) => s + a.balance, 0);
  console.log(`${accounts.length} customer(s) have points, ${total} points in total.`);

  if (!apply) {
    console.log("Dry run: nothing changed. Add --apply --db=<database name> to reset.");
    return;
  }
  if (!dbArg || dbArg !== dbName) {
    throw new Error(`Refusing: --db must be exactly "${dbName}".`);
  }

  let done = 0;
  for (const a of accounts) {
    // Only reset if the balance is still what we read (one database step).
    const res = await LoyaltyAccount.updateOne({ _id: a._id, balance: a.balance }, { $set: { balance: 0 } });
    if (res.modifiedCount !== 1) continue;
    await LoyaltyTransaction.create({
      userId: a.userId,
      type: "adjust",
      points: -a.balance,
      balanceAfter: 0,
      note: "Reset: points from testing",
    });
    done++;
  }
  console.log(`Reset ${done} account(s).`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
