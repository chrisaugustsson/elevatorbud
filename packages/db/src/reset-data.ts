import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { sql } from "drizzle-orm";

const PROD_PATTERNS = [
  "neon.tech",
  "production",
  "prod.",
  "elevatorbud.com",
];

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

if (!process.argv.includes("--confirm")) {
  console.error(
    "Safety: pass --confirm to actually truncate data.\n" +
      "Usage: pnpm db:reset --confirm",
  );
  process.exit(1);
}

// Defense in depth:
// 1. Hard-refuse if NODE_ENV is production — the primary gate.
// 2. Refuse if the URL matches any known prod host pattern — catches
//    misconfigured shells where NODE_ENV wasn't set but the URL is prod.
// Either trigger alone stops the script; both must be safe to proceed.
if (process.env.NODE_ENV === "production") {
  console.error(
    "Refusing to run: NODE_ENV=production.\n" +
      "This script is only for local/dev environments.",
  );
  process.exit(1);
}

const looksLikeProd = PROD_PATTERNS.some((p) =>
  databaseUrl.toLowerCase().includes(p),
);
if (looksLikeProd) {
  console.error(
    "Refusing to run: DATABASE_URL looks like a production database.\n" +
      "This script is only for local/dev environments.",
  );
  process.exit(1);
}

const pool = new Pool({ connectionString: databaseUrl });
const db = drizzle(pool);

// FK dependency order (children before parents):
//   elevator_budgets    → elevators, users
//   elevator_details    → elevators
//   elevators           → organizations, users
//   user_organizations  → users, organizations
//   organizations       → organizations (self, parent_id)
//   users               → (none)
// TRUNCATE ... CASCADE makes order strictly unnecessary, but we order
// explicitly so the script also works without CASCADE and to make the
// dependency direction obvious.
const tables = [
  "elevator_budgets",
  "elevator_details",
  "elevators",
  "user_organizations",
  "organizations",
  "users",
];

for (const table of tables) {
  await db.execute(sql.raw(`TRUNCATE TABLE "${table}" CASCADE`));
  console.log(`Truncated ${table}`);
}

await pool.end();
console.log("Reset complete.");
