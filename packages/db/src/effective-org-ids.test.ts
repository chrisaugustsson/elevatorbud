import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import { Pool } from "pg";
import * as schema from "./schema.js";
import { getEffectiveOrganizationIds } from "./effective-org-ids.js";
import type { Database } from "./index.js";

/**
 * Real-SQL test for getEffectiveOrganizationIds. Requires a running Postgres
 * (the project's `docker compose up -d` satisfies this). Gated behind
 * TEST_DATABASE_URL so unit-test runs don't fail when the DB isn't up —
 * CI is expected to set the env var and run these.
 *
 * The query logic is subtle (a self-join across organizations.parent_id) and
 * a mocked Drizzle chain cannot catch an inverted join. Real SQL is the
 * cheapest way to prove the join direction is correct.
 */

const TEST_DB_URL = process.env.TEST_DATABASE_URL;
const describeIfDb = TEST_DB_URL ? describe : describe.skip;

type Db = NodePgDatabase<typeof schema>;

async function setupSchema(db: Db) {
  await db.execute(sql`DROP TABLE IF EXISTS user_organizations CASCADE`);
  await db.execute(sql`DROP TABLE IF EXISTS organizations CASCADE`);
  await db.execute(sql`DROP TABLE IF EXISTS users CASCADE`);
  await db.execute(sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
  await db.execute(sql`
    CREATE TABLE organizations (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name TEXT NOT NULL,
      organization_number TEXT,
      parent_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE TABLE users (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      clerk_user_id TEXT NOT NULL,
      email TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'customer',
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_login TIMESTAMPTZ
    )
  `);
  await db.execute(sql`
    CREATE TABLE user_organizations (
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (user_id, organization_id)
    )
  `);
}

async function insertUser(db: Db, id: string) {
  await db.insert(schema.users).values({
    id,
    clerkUserId: `clerk_${id}`,
    email: `${id}@test.local`,
    name: id,
  });
}

async function insertOrg(db: Db, id: string, parentId: string | null = null) {
  await db.insert(schema.organizations).values({ id, name: id, parentId });
}

async function grant(db: Db, userId: string, orgId: string) {
  await db
    .insert(schema.userOrganizations)
    .values({ userId, organizationId: orgId });
}

describeIfDb("getEffectiveOrganizationIds (real SQL)", () => {
  let pool: Pool;
  let db: Db;

  beforeAll(async () => {
    pool = new Pool({ connectionString: TEST_DB_URL });
    db = drizzle(pool, { schema });
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    await setupSchema(db);
  });

  it("returns empty array for a user with no grants", async () => {
    await insertUser(db, "00000000-0000-0000-0000-000000000001");
    const result = await getEffectiveOrganizationIds(
      db as unknown as Database,
      "00000000-0000-0000-0000-000000000001",
    );
    expect(result).toEqual([]);
  });

  it("returns the direct grant when the org has no children", async () => {
    const userId = "00000000-0000-0000-0000-000000000001";
    const orgId = "11111111-1111-1111-1111-111111111111";
    await insertUser(db, userId);
    await insertOrg(db, orgId);
    await grant(db, userId, orgId);
    const result = await getEffectiveOrganizationIds(
      db as unknown as Database,
      userId,
    );
    expect(result).toEqual([orgId]);
  });

  it("returns the root plus all 3 children when granted a root org", async () => {
    const userId = "00000000-0000-0000-0000-000000000001";
    const root = "11111111-1111-1111-1111-111111111111";
    const c1 = "11111111-1111-1111-1111-1111111111a1";
    const c2 = "11111111-1111-1111-1111-1111111111a2";
    const c3 = "11111111-1111-1111-1111-1111111111a3";
    await insertUser(db, userId);
    await insertOrg(db, root);
    await insertOrg(db, c1, root);
    await insertOrg(db, c2, root);
    await insertOrg(db, c3, root);
    await grant(db, userId, root);
    const result = await getEffectiveOrganizationIds(
      db as unknown as Database,
      userId,
    );
    expect(result.sort()).toEqual([root, c1, c2, c3].sort());
    expect(result).toHaveLength(4);
  });

  it("returns only the child when granted a child org (no sibling/parent leak)", async () => {
    const userId = "00000000-0000-0000-0000-000000000001";
    const root = "11111111-1111-1111-1111-111111111111";
    const c1 = "11111111-1111-1111-1111-1111111111a1";
    const c2 = "11111111-1111-1111-1111-1111111111a2";
    await insertUser(db, userId);
    await insertOrg(db, root);
    await insertOrg(db, c1, root);
    await insertOrg(db, c2, root);
    await grant(db, userId, c1);
    const result = await getEffectiveOrganizationIds(
      db as unknown as Database,
      userId,
    );
    expect(result).toEqual([c1]);
  });

  it("deduplicates when a user has grants at multiple roots", async () => {
    const userId = "00000000-0000-0000-0000-000000000001";
    const rootA = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
    const rootB = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
    const a1 = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1";
    const a2 = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2";
    const b1 = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1";
    await insertUser(db, userId);
    await insertOrg(db, rootA);
    await insertOrg(db, rootB);
    await insertOrg(db, a1, rootA);
    await insertOrg(db, a2, rootA);
    await insertOrg(db, b1, rootB);
    await grant(db, userId, rootA);
    await grant(db, userId, rootB);
    const result = await getEffectiveOrganizationIds(
      db as unknown as Database,
      userId,
    );
    expect(result.sort()).toEqual([rootA, rootB, a1, a2, b1].sort());
    expect(new Set(result).size).toBe(result.length);
  });

  it("deduplicates when a user has direct grants on both a parent and one of its children", async () => {
    // The FR-33 server check should prevent this grant combination from
    // being created in the first place, but the dedupe in the self-join is
    // the last line of defence — a legacy row or a hand-written grant
    // should still produce a clean result, not duplicates.
    const userId = "00000000-0000-0000-0000-000000000001";
    const parent = "11111111-1111-1111-1111-111111111111";
    const child = "11111111-1111-1111-1111-1111111111a1";
    await insertUser(db, userId);
    await insertOrg(db, parent);
    await insertOrg(db, child, parent);
    await grant(db, userId, parent);
    await grant(db, userId, child);
    const result = await getEffectiveOrganizationIds(
      db as unknown as Database,
      userId,
    );
    expect(result.sort()).toEqual([parent, child].sort());
    expect(new Set(result).size).toBe(result.length);
  });

  it("isolates grants per user — user A's orgs do not leak to user B", async () => {
    const userA = "00000000-0000-0000-0000-00000000000a";
    const userB = "00000000-0000-0000-0000-00000000000b";
    const rootA = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
    const rootB = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
    const childA = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1";
    const childB = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1";
    await insertUser(db, userA);
    await insertUser(db, userB);
    await insertOrg(db, rootA);
    await insertOrg(db, rootB);
    await insertOrg(db, childA, rootA);
    await insertOrg(db, childB, rootB);
    await grant(db, userA, rootA);
    await grant(db, userB, rootB);
    const resultA = await getEffectiveOrganizationIds(
      db as unknown as Database,
      userA,
    );
    const resultB = await getEffectiveOrganizationIds(
      db as unknown as Database,
      userB,
    );
    expect(resultA.sort()).toEqual([rootA, childA].sort());
    expect(resultB.sort()).toEqual([rootB, childB].sort());
  });
});
