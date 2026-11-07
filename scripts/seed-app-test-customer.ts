/**
 * Fill ONE test customer with sample data for the mobile team (API requirements §20):
 * bookings in every status, points history, wallet history and an active membership.
 *
 *   npx tsx scripts/seed-app-test-customer.ts --email=test@example.com                 # look only (dry run)
 *   TEST_CUSTOMER_PASSWORD='…' npx tsx scripts/seed-app-test-customer.ts \
 *       --email=test@example.com --apply --db=<database name>                         # really write
 *
 * - Test database only: refuses unless --db matches the database in MONGODB_URI,
 *   and refuses a database whose name contains "prod". Never run it on the live database.
 * - Creates the customer if missing (password from TEST_CUSTOMER_PASSWORD, never printed).
 *   Share the login with the mobile team privately, not in a document or chat group.
 * - Runs once per customer (it checks for its own wallet entry). Push and email are
 *   switched off while it runs; only in-app notifications are written.
 * - Bookings go 60+ days ahead (or back) at 3–5 am, and take real slot locks, so they
 *   can't clash with anyone's booking.
 */
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
process.env.NOTIFY_SEND_PUSH = "false";
process.env.NOTIFY_SEND_EMAIL = "false";

const SPORTS = ["PADEL", "FUTSAL"] as const;

function arg(name: string) {
  return process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
}

async function main() {
  const mongoose = (await import("mongoose")).default;
  const bcrypt = (await import("bcryptjs")).default;
  const { default: connectDB } = await import("../lib/mongodb");
  const { default: User } = await import("../models/User");
  const { default: Court } = await import("../models/Court");
  const { default: Booking } = await import("../models/Booking");
  const { default: MembershipPlan } = await import("../models/MembershipPlan");
  const { default: WalletTransaction } = await import("../models/WalletTransaction");
  const { acquireSlotLocks, releaseSlotLocks } = await import("../lib/booking-locks");
  const { nextBookingSerial } = await import("../lib/booking-serial");
  const { calculateOriginalPrice } = await import("../lib/pricing-utils");
  const { getBusinessDateKey, shiftDateKey } = await import("../lib/date-time");
  const { creditWallet } = await import("../lib/wallet");
  const { awardLoyaltyForCompletedBooking, adjustLoyaltyPoints } = await import("../lib/loyalty");
  const { activateMembership } = await import("../lib/membership");

  const email = arg("email")?.trim().toLowerCase();
  const apply = process.argv.includes("--apply");
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("Give --email=<test customer email>.");

  await connectDB();
  const dbName = mongoose.connection.db?.databaseName ?? "";
  console.log(`Database: ${dbName}`);
  if (/prod/i.test(dbName) || process.env.NODE_ENV === "production" || /\/\/(www\.)?ibexsportscomplex\.com/.test(process.env.APP_URL ?? "")) {
    throw new Error("Refusing: this looks like the live site or a production database.");
  }

  let user = await User.findOne({ email }).select("name email phone role").lean();
  if (user && user.role !== "user") throw new Error("Refusing: that account is staff, not a customer.");
  const seedKey = (id: string, what: string) => `seed:app-test:${id}:${what}`;
  if (user && (await WalletTransaction.exists({ refKey: seedKey(user._id.toString(), "wallet-1") }))) {
    console.log("Already filled with sample data. Nothing to do.");
    return;
  }

  const courts = await Promise.all(
    SPORTS.map((sport) => Court.findOne({ type: sport, isActive: true }).sort({ createdAt: 1 }).lean()),
  );
  const plan = await MembershipPlan.findOne({ isActive: true, "hoursBySport.0": { $exists: true } })
    .sort({ sortOrder: 1 })
    .lean();
  const today = getBusinessDateKey();
  const rows = [
    { status: "pending_payment", sport: 0, date: shiftDateKey(today, 61), start: 3 },
    { status: "confirmed", sport: 0, date: shiftDateKey(today, 62), start: 4, paidPct: 50 },
    { status: "confirmed", sport: 1, date: shiftDateKey(today, 63), start: 3, paidPct: 100, duration: 1.5 },
    { status: "completed", sport: 0, date: shiftDateKey(today, -61), start: 4, paidPct: 100 },
    { status: "completed", sport: 1, date: shiftDateKey(today, -62), start: 3, paidPct: 100, duration: 1.5 },
    { status: "cancelled", sport: 0, date: shiftDateKey(today, -63), start: 5, paidPct: 50 },
  ] as const;

  console.log(`Customer: ${email} (${user ? "exists" : "will be created"})`);
  console.log(`Courts: ${courts.map((c, i) => (c ? `${SPORTS[i]} → ${c.name}` : `${SPORTS[i]} → none found`)).join(", ")}`);
  console.log(`Membership plan: ${plan ? plan.name : "none on sale with hours per sport (membership skipped)"}`);
  console.log("Would add:");
  for (const r of rows) console.log(`  - ${r.status} ${SPORTS[r.sport]} booking on ${r.date} at ${r.start}:00`);
  console.log("  - wallet: PKR 2,000 credit (a cancelled booking refund) and PKR 1,000 goodwill");
  console.log("  - points: earned on the completed bookings, plus 150 bonus points");

  if (!apply) {
    console.log("Dry run: nothing changed. Add --apply --db=<database name> to write.");
    return;
  }
  if (arg("db") !== dbName) throw new Error(`Refusing: --db must be exactly "${dbName}".`);
  if (courts.some((c) => !c)) throw new Error("Need an active Padel and Futsal court.");

  if (!user) {
    const password = process.env.TEST_CUSTOMER_PASSWORD;
    if (!password || password.length < 8) throw new Error("Set TEST_CUSTOMER_PASSWORD (8+ characters) to create the customer.");
    await User.create({
      email,
      name: "App Test Customer",
      phone: "03001234567",
      role: "user",
      password: await bcrypt.hash(password, 10),
    });
    user = await User.findOne({ email }).select("name email phone role").lean();
    console.log("Created the customer.");
  }
  const userId = user!._id.toString();

  const made: Record<string, string> = {};
  for (const r of rows) {
    const court = courts[r.sport]!;
    const duration = "duration" in r ? r.duration : 1;
    const { originalPrice } = calculateOriginalPrice(court as never, r.start, duration);
    const paid = Math.round((originalPrice * ("paidPct" in r ? r.paidPct : 0)) / 100);
    const bookingId = new mongoose.Types.ObjectId();
    const locked = await acquireSlotLocks({ courtId: court._id, bookingId, dateKey: r.date, startHour: r.start, durationHours: duration });
    if (!locked && r.status !== "completed" && r.status !== "cancelled") {
      console.log(`  ! ${r.date} ${r.start}:00 is taken; skipped.`);
      continue;
    }
    try {
      await Booking.create({
        _id: bookingId,
        courtId: court._id,
        date: r.date,
        startTime: r.start,
        duration,
        serialNumber: await nextBookingSerial(),
        userId,
        userName: user!.name,
        userEmail: email,
        userPhone: user!.phone || "03001234567",
        status: r.status,
        originalPrice,
        totalPrice: originalPrice,
        amountPaid: paid,
        amountReceivedOnline: paid,
        advancePercent: 50,
        advanceRequired: Math.ceil(originalPrice / 2),
        source: "app",
      });
    } catch (err) {
      await releaseSlotLocks(bookingId);
      throw err;
    }
    // Past and cancelled bookings don't need to keep their half hours.
    if (r.status === "completed" || r.status === "cancelled") await releaseSlotLocks(bookingId);
    made[`${r.status}-${r.sport}`] = bookingId.toString();
    console.log(`  + ${r.status} ${SPORTS[r.sport]} ${r.date} ${r.start}:00 (PKR ${originalPrice}, paid ${paid})`);
  }

  for (const [key, id] of Object.entries(made)) {
    if (key.startsWith("completed")) await awardLoyaltyForCompletedBooking(id);
  }
  await adjustLoyaltyPoints({ userId, delta: 150, note: "Sample bonus points (test data)" });

  const cancelled = made["cancelled-0"];
  await creditWallet({ userId, amount: 2000, reason: "booking_refund", refKey: seedKey(userId, "wallet-1"), bookingId: cancelled ?? null, note: "Refund for a cancelled booking (test data)" });
  await creditWallet({ userId, amount: 1000, reason: "admin_adjustment", refKey: seedKey(userId, "wallet-2"), note: "Goodwill (test data)" });

  if (plan) {
    await activateMembership({ userId, planId: plan._id.toString(), carryForwardHours: false });
    console.log(`  + membership ${plan.name}`);
  }
  console.log("Done. Share the login privately with the mobile team.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
