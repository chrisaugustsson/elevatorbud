import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
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

const client = neon(databaseUrl);
const db = drizzle(client);

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

console.log("Reset complete.");
