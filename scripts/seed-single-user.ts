// Seed or update a single user in MongoDB.
// Usage:
//   npx tsx scripts/seed-single-user.ts --email you@example.com --password 'Secret123!' --role admin

require("dotenv").config({
  path: require("path").resolve(process.cwd(), ".env.local"),
});

import bcrypt from "bcryptjs";
import connectDB from "../lib/mongodb";
import User from "../models/User";

type Role = "super_admin" | "admin" | "user";

function getArgValue(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return undefined;
  const value = process.argv[idx + 1];
  return value;
}

async function main() {
  const emailRaw = getArgValue("--email");
  const password = getArgValue("--password");
  const roleRaw = getArgValue("--role") ?? "admin";

  if (!emailRaw) {
    console.error("Missing --email");
    process.exit(1);
  }
  if (!password) {
    console.error("Missing --password");
    process.exit(1);
  }

  const email = emailRaw.trim().toLowerCase();
  const role = roleRaw as Role;

  if (!["super_admin", "admin", "user"].includes(role)) {
    console.error(`Invalid --role "${role}". Use super_admin|admin|user.`);
    process.exit(1);
  }

  // Name is required by the schema; derive a friendly default from the email.
  const name = email.split("@")[0]?.replace(/[\W_]+/g, " ").trim() || "Developer";

  await connectDB();

  const hashedPassword = await bcrypt.hash(password, 10);

  // Upsert so re-running is safe.
  await User.updateOne(
    { email },
    {
      $set: {
        name,
        role,
        password: hashedPassword,
      },
    },
    { upsert: true }
  );

  const user = await User.findOne({ email }).select({ email: 1, role: 1, name: 1 });
  console.log(`✅ Seeded user: ${user?.email} (${user?.role})`);
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Seed user failed:", err);
  process.exit(1);
});

