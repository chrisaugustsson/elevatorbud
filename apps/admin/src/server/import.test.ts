import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { sql } from "drizzle-orm";
import { Pool } from "pg";
import { schema, type Database } from "@elevatorbud/db";
import { confirmFn } from "./import";

/**
 * Real-DB integration test for confirmImport transactional integrity
 * (US-011 / FR-11). Proves that a failure mid-import leaves zero side
 * effects — the claim that the import is "all or nothing" is only as
 * strong as the test that breaks it.
 *
 * Requires TEST_DATABASE_URL pointing at a disposable Postgres (the
 * project's `docker compose up -d` satisfies this). Gated behind the env
 * var so non-CI runs don't fail when the DB isn't up.
 */

const TEST_DB_URL = process.env.TEST_DATABASE_URL;
const describeIfDb = TEST_DB_URL ? describe : describe.skip;

describeIfDb("confirmImport (real DB)", () => {
  let pool: Pool;
  let db: Database;
  let orgId: string;
  let userId: string;

  beforeAll(async () => {
    // node-postgres for tests — SQL is identical to neon-serverless, and
    // it speaks plain TCP to the docker Postgres without needing the
    // WebSocket shim neon-serverless expects.
    pool = new Pool({ connectionString: TEST_DB_URL });
    db = drizzle(pool, { schema }) as unknown as Database;

    // Run every migration so triggers (one-level-deep) and check
    // constraints are all present — the rollback proof is only as honest
    // as the schema it runs against.
    await migrate(drizzle(pool, { schema }), {
      migrationsFolder: "../../packages/db/drizzle",
    });
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    // Clean state between tests. Order follows FK direction; CASCADE
    // handles the rest.
    await db.execute(sql`TRUNCATE TABLE elevator_budgets CASCADE`);
    await db.execute(sql`TRUNCATE TABLE elevator_details CASCADE`);
    await db.execute(sql`TRUNCATE TABLE elevators CASCADE`);
    await db.execute(sql`TRUNCATE TABLE user_organizations CASCADE`);
    await db.execute(sql`TRUNCATE TABLE users CASCADE`);
    await db.execute(sql`TRUNCATE TABLE organizations CASCADE`);

    const [org] = await db
      .insert(schema.organizations)
      .values({ name: "TestOrg" })
      .returning();
    orgId = org!.id;

    const [user] = await db
      .insert(schema.users)
      .values({
        clerkUserId: "clerk_test_user",
        email: "test@example.local",
        name: "Test User",
        role: "admin",
      })
      .returning();
    userId = user!.id;
  });

  it("skips the failing row and commits the valid rows in the same chunk", async () => {
    // Row 1 is valid; row 2 has build_year=999 which violates
    // elevators_build_year_check (1800-2100). With per-row savepoints,
    // row 1 must commit and row 2 must appear in the failures list — the
    // whole-chunk rollback behavior is intentionally gone so one bad row
    // doesn't torpedo an otherwise-clean import.
    const result = await confirmFn(db, userId, {
      elevators: [
        {
          elevator_number: "H1",
          build_year: 1980,
          _organizationId: orgId,
          _source_row: 5,
          _source_sheet: "Hissar",
        },
        {
          elevator_number: "H2",
          build_year: 999,
          _organizationId: orgId,
          _source_row: 42,
          _source_sheet: "Hissar",
        },
      ],
    });

    expect(result.created).toBe(1);
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0]).toMatchObject({
      elevator_number: "H2",
      row: 42,
      sheet: "Hissar",
    });
    expect(result.failures[0]!.reason).toMatch(/build_year/);

    const rows = await db.select().from(schema.elevators);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.elevatorNumber).toBe("H1");

    // Details must follow the successful elevator only — no orphan rows
    // from the failed savepoint.
    const details = await db.select().from(schema.elevatorDetails);
    expect(details).toHaveLength(1);
  });

  it("creates both rows when two input rows share the same (org, elevator_number)", async () => {
    // Duplicates within one org are allowed by design — every import row
    // becomes its own new elevator, even if the number matches an existing
    // or in-batch row.
    const result = await confirmFn(db, userId, {
      elevators: [
        {
          elevator_number: "H1",
          _organizationId: orgId,
          _source_row: 5,
          _source_sheet: "Hissar",
        },
        {
          elevator_number: "H1",
          _organizationId: orgId,
          _source_row: 42,
          _source_sheet: "Hissar",
        },
      ],
    });

    expect(result.created).toBe(2);
    expect(result.failures).toHaveLength(0);
    const rows = await db.select().from(schema.elevators);
    expect(rows).toHaveLength(2);
  });

  it("records a failure for rows whose org id is missing", async () => {
    const missingOrgId = "00000000-0000-0000-0000-000000000099";
    const result = await confirmFn(db, userId, {
      elevators: [
        {
          elevator_number: "H1",
          _organizationId: missingOrgId,
          _source_row: 5,
          _source_sheet: "Hissar",
        },
      ],
    });

    expect(result.created).toBe(0);
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0]).toMatchObject({
      elevator_number: "H1",
      row: 5,
      sheet: "Hissar",
    });
    expect(result.failures[0]!.reason).toMatch(/[Oo]rganisation/);

    const remaining = await db.select().from(schema.elevators);
    expect(remaining).toHaveLength(0);
  });

  it("commits successfully when all rows are valid", async () => {
    // Positive-path sanity check: the per-row isolation assertions above
    // are only meaningful if the happy path actually writes rows.
    const result = await confirmFn(db, userId, {
      elevators: [
        {
          elevator_number: "H1",
          build_year: 1980,
          _organizationId: orgId,
          _source_row: 5,
          _source_sheet: "Hissar",
        },
        {
          elevator_number: "H2",
          build_year: 1990,
          _organizationId: orgId,
          _source_row: 6,
          _source_sheet: "Hissar",
        },
      ],
    });

    expect(result.created).toBe(2);
    const rows = await db.select().from(schema.elevators);
    expect(rows).toHaveLength(2);
  });
});
