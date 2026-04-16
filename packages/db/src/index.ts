import { Pool, neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { drizzle as drizzleHttp } from "drizzle-orm/neon-http";
import * as schema from "./schema.js";

export function createDb(databaseUrl: string) {
  const pool = new Pool({ connectionString: databaseUrl });
  return drizzle(pool, { schema });
}

export type Database = ReturnType<typeof createDb>;

export function createDbHttp(databaseUrl: string) {
  const sql = neon(databaseUrl);
  return drizzleHttp(sql, { schema });
}

export type DatabaseHttp = ReturnType<typeof createDbHttp>;

/**
 * Run `fn` with a freshly-opened Neon pool, ending the pool before the caller
 * continues. Use this for every **write** server-side DB access (anything
 * that needs a real transaction or multiple statements scoped together) in
 * Cloudflare Workers / Miniflare environments.
 *
 * Per Neon's official serverless-driver guidance, a Pool must be created
 * *inside* the request handler and closed before it returns — the WebSocket
 * driver keeps event callbacks (pings, error handlers, reconnect logic)
 * attached to the Pool, and holding one Pool across Worker requests makes
 * those callbacks fire from a previous request's context, which the runtime
 * aborts with "cross-request promise resolution" warnings and, in a burst,
 * hangs the whole worker.
 *
 * @see https://github.com/neondatabase/serverless#a-note-on-cloudflare-workers
 */
export async function withDb<T>(
  fn: (db: Database) => Promise<T>,
): Promise<T> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
  }
  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool, { schema });
  try {
    return await fn(db);
  } finally {
    await pool.end();
  }
}

/**
 * Read-only counterpart to `withDb`. Uses Neon's HTTP driver — one HTTP
 * round-trip per query, no WebSocket handshake. Prefer this for anything
 * that only reads or issues a single write, because it's noticeably faster
 * on edge runtimes where the WS setup dominates a small query.
 *
 * Does NOT support interactive transactions. `db.transaction(...)` falls
 * back to firing the statements one-by-one with no atomicity guarantee, so
 * any code path that needs cross-statement rollback must stay on `withDb`.
 * The `DatabaseHttp` type exposes the same query builder as `Database` but
 * the transaction signature differs — rely on the type system to steer
 * writes to the right driver rather than memorizing which call sites do
 * what.
 */
export async function withDbHttp<T>(
  fn: (db: DatabaseHttp) => Promise<T>,
): Promise<T> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
  }
  const db = createDbHttp(databaseUrl);
  return await fn(db);
}

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
