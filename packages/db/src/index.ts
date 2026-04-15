import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "./schema.js";

export function createDb(databaseUrl: string) {
  const pool = new Pool({ connectionString: databaseUrl });
  return drizzle(pool, { schema });
}

export type Database = ReturnType<typeof createDb>;

/**
 * Test-only factory that exposes the underlying pool so integration tests
 * can close it cleanly at the end of a suite. Runtime code uses `createDb`
 * and lets the pool live for the process lifetime.
 */
export function createTestDb(databaseUrl: string) {
  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool, { schema });
  return { db, pool };
}

export * from "./schema.js";
export { schema };
export { getEffectiveOrganizationIds } from "./effective-org-ids.js";
