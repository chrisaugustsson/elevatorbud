import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { migrate } from "drizzle-orm/neon-serverless/migrator";
import { sql } from "drizzle-orm";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const MIGRATIONS_FOLDER = "./drizzle";

const pool = new Pool({ connectionString: databaseUrl });
const db = drizzle(pool);

await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });

// ──────────────────────────────────────────────────────────────────────
// Verification — drizzle's migrator silently filters journal entries
// whose `when` is older than the latest applied `created_at` in
// __drizzle_migrations, then exits 0 with "Migrations complete." even
// when nothing happened. Has burned us twice. Re-check here that the
// latest journal entry's hash is actually in the migrations table; if
// not, throw so the failure is loud.
// ──────────────────────────────────────────────────────────────────────

type JournalEntry = { idx: number; tag: string; when: number };
type Journal = { entries: JournalEntry[] };

const journal: Journal = JSON.parse(
  readFileSync(join(MIGRATIONS_FOLDER, "meta", "_journal.json"), "utf8"),
);

if (journal.entries.length > 0) {
  const latest = journal.entries.reduce((a, b) => (a.idx > b.idx ? a : b));
  const sqlPath = join(MIGRATIONS_FOLDER, `${latest.tag}.sql`);
  const sqlContent = readFileSync(sqlPath, "utf8");
  // Drizzle hashes the raw file content (sha256, hex). Verified by
  // comparing __drizzle_migrations.hash for known-applied migrations.
  const expectedHash = createHash("sha256").update(sqlContent).digest("hex");

  const result = await db.execute<{ hash: string }>(
    sql`SELECT hash FROM drizzle.__drizzle_migrations WHERE hash = ${expectedHash} LIMIT 1`,
  );

  if (result.rows.length === 0) {
    await pool.end();
    throw new Error(
      [
        "",
        `Migration verification FAILED.`,
        ``,
        `Latest journal entry: ${latest.tag} (idx ${latest.idx}, when ${latest.when})`,
        `Expected hash: ${expectedHash}`,
        `Not found in drizzle.__drizzle_migrations.`,
        ``,
        `Drizzle's migrator silently skipped this migration. Most common cause:`,
        `the new entry's \`when\` value in drizzle/meta/_journal.json is less than`,
        `the highest \`created_at\` already in __drizzle_migrations on the target DB.`,
        ``,
        `Fix: bump this migration's \`when\` in _journal.json to be larger than`,
        `every prior \`when\`, then re-run \`pnpm db:migrate\`.`,
        "",
      ].join("\n"),
    );
  }
}

await pool.end();
console.log(
  `Migrations complete (verified ${journal.entries.length} entries against __drizzle_migrations).`,
);
