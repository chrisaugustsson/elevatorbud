import { Pool } from "@neondatabase/serverless";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const tables = await pool.query(`
  SELECT schemaname, tablename FROM pg_tables
  WHERE schemaname NOT IN ('pg_catalog','information_schema')
  ORDER BY schemaname, tablename
`);
console.log("Existing tables:");
for (const r of tables.rows) console.log("  " + r.schemaname + "." + r.tablename);

try {
  const mig = await pool.query(
    "SELECT hash, created_at FROM drizzle.__drizzle_migrations ORDER BY id",
  );
  console.log("\nDrizzle journal entries: " + mig.rows.length);
  for (const r of mig.rows) console.log("  " + r.hash + " @ " + r.created_at);
} catch {
  console.log("\nNo drizzle.__drizzle_migrations table — journal empty");
}

await pool.end();
