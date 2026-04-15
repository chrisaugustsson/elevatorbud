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

    // Run every migration so triggers (one-level-deep), composite unique
    // indexes, and check constraints are all present — the rollback proof
    // is only as honest as the schema it runs against.
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

  it("rolls back all writes when a row violates a check constraint", async () => {
    // Row 1 is valid; row 2 has build_year=999 which violates
    // elevators_build_year_check (1800-2100). If the transaction were
    // partial, row 1 would remain after the throw — this test proves it
    // doesn't.
    await expect(
      confirmFn(db, userId, {
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
      }),
    ).rejects.toThrow(/Transaktionen har rullats tillbaka/);

    const remaining = await db.select().from(schema.elevators);
    expect(remaining).toHaveLength(0);

    const detailsRemaining = await db.select().from(schema.elevatorDetails);
    expect(detailsRemaining).toHaveLength(0);
  });

  it("rolls back when two input rows share the same (org, elevator_number)", async () => {
    // The pre-check should catch this before the DB is touched, and point
    // at row 2 — not the default "row 0 blame" the legacy code fell back
    // on. Still expected: zero rows written.
    await expect(
      confirmFn(db, userId, {
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
      }),
    ).rejects.toThrow(/rad 42/);

    const remaining = await db.select().from(schema.elevators);
    expect(remaining).toHaveLength(0);
  });

  it("rolls back when the resolved org id does not exist", async () => {
    const missingOrgId = "00000000-0000-0000-0000-000000000099";
    await expect(
      confirmFn(db, userId, {
        elevators: [
          {
            elevator_number: "H1",
            _organizationId: missingOrgId,
            _source_row: 5,
            _source_sheet: "Hissar",
          },
        ],
      }),
    ).rejects.toThrow(/organisation.*hittades inte/);

    const remaining = await db.select().from(schema.elevators);
    expect(remaining).toHaveLength(0);
  });

  it("commits successfully when all rows are valid", async () => {
    // Positive-path sanity check: the rollback assertions above are only
    // meaningful if the happy path actually writes rows.
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
