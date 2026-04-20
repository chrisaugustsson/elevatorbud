# PRD: Migrate from Convex to Neon Postgres + Drizzle + tRPC

## Introduction

Replace the Convex backend with Neon Postgres (Drizzle ORM) and tRPC to solve fundamental query limitations. The current Convex setup requires expensive workarounds (aggregates, denormalization, `.collect()` full-table scans) for operations that are trivial in SQL — filtered pagination, multi-column queries, GROUP BY aggregations. The app is pre-launch with no production users, making this the ideal time to migrate.

## Goals

- Eliminate all `.collect()` full-table scans — use SQL `WHERE`, `JOIN`, `GROUP BY`, `COUNT`, `SUM`
- Server-side filtering and pagination for all list views
- Shared API layer (tRPC) consumed by both admin and client apps
- Maintain existing UI components — migration is backend-only from the user's perspective
- Reduce Convex bandwidth costs (currently 875 MB / 1 GB on free tier from development alone)
- Deploy database on Neon Postgres, API embedded in each app's TanStack Start server functions
- Shared packages architecture: `packages/db/` for schema, `packages/api/` for tRPC router definitions

## Architecture

```
packages/
  db/                     — Drizzle schema, connection, migrations
    schema.ts             — Table definitions with relations
    index.ts              — DB client + connection
    migrate.ts            — Migration runner
    drizzle/              — Generated migrations

  api/                    — tRPC router definitions (auth-agnostic)
    routers/
      elevator.ts         — Elevator CRUD + listing + search
      analytics.ts        — Stats + chart data
      modernization.ts    — Timeline, budget, priority list
      maintenance.ts      — Inspection, companies, emergency phone
      organization.ts     — Org CRUD
      user.ts             — User management
      suggestedValues.ts  — Reference data
      cms.ts              — Pages
      contact.ts          — Contact submissions
      import.ts           — CSV import
    root.ts               — Merged router
    context.ts            — Base context (db, user, orgScope)

apps/
  admin/
    server/
      trpc.ts             — Admin BFF: imports shared router,
                            wraps with adminProcedure (Clerk JWT → must be admin)
  client/
    server/
      trpc.ts             — Client BFF: imports shared router,
                            wraps with clientProcedure (Clerk JWT → must be customer,
                            always scoped to own org)
```

**Auth boundary:**
- `packages/api/` defines query logic but NOT auth — procedures accept a pre-verified context with `user` and `orgScope`
- Each app's BFF verifies the Clerk JWT and injects the auth context
- Admin BFF: user must be admin, can scope to any org or all orgs
- Client BFF: user must be customer, always scoped to their own org

**Data flow:**
- Frontend component → TanStack Query → TanStack Start server function → tRPC procedure → Drizzle query → Neon Postgres

## User Stories

### US-001: Set up Neon database and Drizzle schema
**Description:** As a developer, I need the database schema defined in Drizzle so I can run migrations and start building queries.

**Acceptance Criteria:**
- [ ] Neon project created (EU region)
- [ ] Drizzle schema in `packages/db/` defines all tables: `elevators`, `elevator_details`, `elevator_budgets`, `organizations`, `users`, `suggested_values`, `pages`, `contact_submissions`
- [ ] Schema matches current Convex schema (field names, types, relationships)
- [ ] Foreign keys defined: `elevator_details.elevator_id → elevators.id`, `elevator_budgets.elevator_id → elevators.id`, `elevators.organization_id → organizations.id`, etc.
- [ ] Indexes created for: `elevators(organization_id)`, `elevators(elevator_number)`, `elevators(organization_id, status)`, `elevators(district)`, `elevators(manufacturer)`, `elevators(elevator_type)`, `elevator_details(elevator_id)`, `elevator_budgets(elevator_id)`
- [ ] Migration runs successfully against Neon
- [ ] Typecheck passes

### US-002: Set up shared tRPC router + per-app BFF
**Description:** As a developer, I need a shared API layer with per-app auth wrappers so both apps reuse query logic but enforce their own auth rules.

**Acceptance Criteria:**
- [ ] Shared tRPC router in `packages/api/` with procedures that accept a pre-verified context (`db`, `user`, `orgScope`)
- [ ] Admin BFF in `apps/admin/server/trpc.ts`: verifies Clerk JWT, requires admin role, injects context
- [ ] Client BFF in `apps/client/server/trpc.ts`: verifies Clerk JWT, requires customer role, forces org scope to user's org
- [ ] `orgScopedProcedure` in shared router accepts optional `organizationId` — the BFF decides whether to allow it or force it
- [ ] tRPC client configured in both apps using TanStack Start server functions
- [ ] Typecheck passes

### US-003: Migrate organization CRUD
**Description:** As an admin, I want to manage organizations so that the core entity exists for all other data.

**Acceptance Criteria:**
- [ ] `organization.list` — returns all organizations
- [ ] `organization.get` — returns single organization by ID
- [ ] `organization.create` — creates new organization
- [ ] `organization.update` — updates organization fields
- [ ] Admin app organization pages work with new API
- [ ] Typecheck passes

### US-004: Migrate user management + Clerk webhook
**Description:** As an admin, I want user management to work with the new backend, including Clerk webhook sync.

**Acceptance Criteria:**
- [ ] Clerk webhook endpoint receives user.created/updated/deleted events
- [ ] Webhook creates/updates/deletes user records in Postgres
- [ ] `user.me` — returns current user from Clerk session
- [ ] `user.list` — admin lists all users with role/org filters
- [ ] `user.update` — admin updates user role, org, active status
- [ ] `user.deactivate` / `user.activate` — toggle user active flag
- [ ] Deactivated users are rejected by `protectedProcedure`
- [ ] Typecheck passes

### US-005: Migrate elevator CRUD
**Description:** As an admin, I want to create, read, update, and archive elevators across all three tables.

**Acceptance Criteria:**
- [ ] `elevator.get` — returns core elevator data
- [ ] `elevator.getDetails` — returns technical specs from `elevator_details`
- [ ] `elevator.getLatestBudget` — returns most recent budget entry
- [ ] `elevator.create` — inserts into `elevators`, `elevator_details`, and `elevator_budgets` in a transaction
- [ ] `elevator.update` — patches core fields, upserts details, inserts new budget entry if budget fields changed
- [ ] `elevator.archive` — sets status to demolished/archived
- [ ] `elevator.checkElevatorNumber` — checks for duplicate elevator numbers
- [ ] `elevator.search` — text search on elevator_number and address
- [ ] All mutations auto-add new suggested values
- [ ] Admin app detail page, edit page, and wizard work with new API
- [ ] Typecheck passes

### US-006: Migrate elevator listing with server-side filtering and pagination
**Description:** As a user, I want to browse, filter, sort, and paginate elevators without loading all data.

**Acceptance Criteria:**
- [ ] `elevator.list` — returns paginated results with total count
- [ ] SQL `WHERE` clauses for: status, district, elevator_type, manufacturer, maintenance_company, inspection_authority, build_year range, modernized/not modernized
- [ ] Text search across elevator_number, address, district, manufacturer, elevator_type
- [ ] SQL `ORDER BY` for any sortable column
- [ ] SQL `LIMIT/OFFSET` for pagination
- [ ] Multiple filters combine with `AND`
- [ ] `elevator.exportData` — returns all filtered results (no pagination) for CSV export
- [ ] Register table in admin app works with new API
- [ ] Typecheck passes

### US-007: Migrate analytics/dashboard with SQL aggregations
**Description:** As a user, I want dashboard statistics and charts that compute server-side via SQL.

**Acceptance Criteria:**
- [ ] `analytics.stats` — total count, average age, modernization within 3 years, budget current year, without modernization, last inventory. Uses `COUNT`, `AVG`, `SUM` with `WHERE` and `JOIN` to `elevator_budgets`
- [ ] `analytics.chartData` — group by district, elevator_type, manufacturer, maintenance_company (SQL `GROUP BY` + `COUNT`). Age distribution via `CASE WHEN` buckets. Modernization timeline via `JOIN` to latest budget
- [ ] Organization-scoped: filter by `organization_id`
- [ ] Admin all-orgs: no filter (SQL handles it natively)
- [ ] Dashboard page and org overview page work with new API
- [ ] Typecheck passes

### US-008: Migrate modernization queries
**Description:** As a user, I want modernization timeline, budget, and priority list views.

**Acceptance Criteria:**
- [ ] `modernization.timeline` — `GROUP BY recommended_modernization_year` with `COUNT`, joined to latest budget per elevator using a window function or subquery
- [ ] `modernization.budget` — `SUM(budget_amount)` grouped by year, district, type
- [ ] `modernization.priorityList` — paginated list of elevators with budget data, filtered by year range
- [ ] Org modernization view works with new API
- [ ] Typecheck passes

### US-009: Migrate maintenance queries
**Description:** As a user, I want inspection calendar, company matrix, and emergency phone status views.

**Acceptance Criteria:**
- [ ] `maintenance.inspectionCalendar` — `GROUP BY inspection_month` with `COUNT`
- [ ] `maintenance.companies` — company × district matrix via SQL
- [ ] `maintenance.emergencyPhoneStatus` — counts with/without phone, needs upgrade, total cost via `JOIN` to `elevator_details`
- [ ] `maintenance.inspectionList` — filtered elevator list by month
- [ ] `maintenance.todaysElevators` — elevators created/updated today by current user
- [ ] Maintenance pages work with new API
- [ ] Typecheck passes

### US-010: Migrate CSV import with integration tests
**Description:** As an admin, I want to import elevators from Excel/CSV files, with integration tests that verify the full import pipeline against a real Postgres database.

**Acceptance Criteria:**
- [ ] Import endpoint accepts parsed elevator data
- [ ] Creates/updates elevators, details, and budgets in a transaction
- [ ] Auto-creates organizations that don't exist
- [ ] Auto-adds suggested values for new field values
- [ ] Reports created/updated/error counts
- [ ] Import page in admin app works with new API
- [ ] Typecheck passes
- [ ] Docker Compose setup with Postgres container for local dev and testing
- [ ] Integration tests run against Dockerized Postgres (not Neon)
- [ ] Test fixture: `Statuslista Bostadsbolaget.xlsx` in project root (real production data)
- [ ] Test: import fresh Excel file → correct row counts in all 3 tables
- [ ] Test: re-import same CSV → updates existing, no duplicates
- [ ] Test: import with missing org → org auto-created
- [ ] Test: import with budget data → elevator_budgets entries created
- [ ] Test: import with invalid elevator_number → error reported, valid rows still imported
- [ ] Tests run in CI

### US-011: Migrate CMS pages
**Description:** As an admin, I want to manage website pages (CMS) stored in Postgres.

**Acceptance Criteria:**
- [ ] `cms.getPage` — public query, returns published page by slug
- [ ] `cms.getPageAdmin` — admin query, returns page regardless of published status
- [ ] `cms.listPages` — public query, returns only published pages
- [ ] `cms.updatePage` — admin mutation to update page content
- [ ] CMS admin page and client website work with new API
- [ ] Typecheck passes

### US-012: Migrate contact form submissions
**Description:** As an admin, I want to view and manage contact form submissions.

**Acceptance Criteria:**
- [ ] `contact.submit` — public mutation (no auth) to create submission
- [ ] `contact.list` — admin query with status filter
- [ ] `contact.updateStatus` — admin mutation to mark as read/archived
- [ ] Contact form on client site and admin inbox work with new API
- [ ] Typecheck passes

### US-013: Migrate suggested values (reference data)
**Description:** As an admin, I want to manage reference data (districts, elevator types, manufacturers, etc.).

**Acceptance Criteria:**
- [ ] `suggestedValues.list` — list by category with active/inactive filter
- [ ] `suggestedValues.create` — add new value
- [ ] `suggestedValues.update` — rename value
- [ ] `suggestedValues.merge` — merge two values (delete source)
- [ ] `suggestedValues.toggleActive` — activate/deactivate
- [ ] Reference data page in admin app works with new API
- [ ] Typecheck passes

### US-014: Docker Compose + test infrastructure
**Description:** As a developer, I want a local Postgres via Docker for development and integration testing, so I don't hit Neon during tests and can run the full stack locally.

**Acceptance Criteria:**
- [ ] `docker-compose.yml` at project root with Postgres 16 container
- [ ] Drizzle migrations run automatically on container start (or via a script)
- [ ] `.env.test` with local Postgres connection string
- [ ] Test setup: creates fresh database per test run (or truncates tables)
- [ ] Test teardown: cleans up
- [ ] `vitest` configured for integration tests in `packages/db/`
- [ ] `pnpm test:integration` script runs integration tests against Docker Postgres
- [ ] Docker Compose also usable for local development (`pnpm dev` connects to local Postgres)
- [ ] `.env.local` example with local Postgres connection string
- [ ] Typecheck passes

### US-015: Configure production deployment
**Description:** As a developer, I want both apps deployed with their embedded BFFs connecting to Neon.

**Acceptance Criteria:**
- [ ] Neon connection string configured via environment variables in both apps
- [ ] Clerk secret key configured in both apps
- [ ] TanStack Start server functions connect to Neon via `@neondatabase/serverless` driver
- [ ] Both apps build and deploy successfully
- [ ] Typecheck passes

### US-016: Remove Convex dependencies
**Description:** As a developer, I want to clean up all Convex code after migration is verified.

**Acceptance Criteria:**
- [ ] Remove `convex/` directory
- [ ] Remove `@convex-dev/react-query`, `convex`, `@convex-dev/aggregate`, `convex-helpers` from dependencies
- [ ] Remove `ConvexProvider` and `ConvexQueryClient` from router setup
- [ ] Remove Convex environment variables
- [ ] No remaining imports from `convex/` or `@convex`
- [ ] Both apps build and run successfully
- [ ] Typecheck passes

## Functional Requirements

- FR-1: All list views must use server-side SQL pagination (`LIMIT/OFFSET`) with total count
- FR-2: All filter combinations must be handled server-side via SQL `WHERE` clauses
- FR-3: All chart/stats data must be computed server-side via SQL `GROUP BY`, `COUNT`, `SUM`, `AVG`
- FR-4: Elevator mutations must write to all relevant tables (`elevators`, `elevator_details`, `elevator_budgets`) in a single transaction
- FR-5: Budget updates must create new entries (history), not overwrite existing ones
- FR-6: Auth must verify Clerk JWT on every protected procedure
- FR-7: Org scoping must be enforced server-side — customers only see their own org's data
- FR-8: The "latest budget" for an elevator is the most recent `elevator_budgets` entry by `created_at`
- FR-9: CSV import must be transactional — all-or-nothing per batch
- FR-10: Suggested values must auto-populate when new field values appear during create/import

## Non-Goals

- Real-time subscriptions (TanStack Query with stale-while-revalidate is sufficient)
- Aggregate B-trees or denormalized counters (SQL handles this natively)
- File storage migration (not currently used beyond CMS)
- Mobile app support
- Multi-tenancy at the database level (single database, org scoping via queries)
- Changing the UI — this is a backend migration only

## Technical Considerations

- **Database:** Neon Postgres (EU region, Launch plan with scale-to-zero)
- **ORM:** Drizzle with `@neondatabase/serverless` driver
- **API:** tRPC v11 with TanStack Query integration, embedded in TanStack Start server functions (no separate API deployment)
- **Auth:** Clerk JWT verification in each app's BFF middleware
- **Monorepo packages:**
  - `packages/db/` — Drizzle schema, migrations, connection
  - `packages/api/` — tRPC router definitions (auth-agnostic, receives pre-verified context)
  - Each app has its own BFF that wraps the shared router with auth
- **Local dev:** Docker Compose with Postgres 16 — `pnpm dev` uses local DB, Neon is production only
- **Testing:** Vitest integration tests against Dockerized Postgres, especially for import pipeline
- **Migration order:** Docker + DB schema → shared packages → BFFs → migrate endpoints one by one → verify each page → remove Convex
- **The "latest budget" query pattern:** Use `DISTINCT ON (elevator_id) ... ORDER BY elevator_id, created_at DESC` or a window function to get the most recent budget per elevator efficiently

## Success Metrics

- Zero `.collect()` full-table scans — all queries use proper SQL
- Register page loads in under 500ms with 1000+ elevators and filters active
- Dashboard/chart pages load in under 1 second
- Database bandwidth stays under 100 MB/month at current development usage
- Both apps pass typecheck and function identically to current behavior

## Open Questions

- For the "latest budget per elevator" query — use `DISTINCT ON` (Postgres-specific) or a subquery? `DISTINCT ON` is cleaner but less portable.
- Should we use Neon's built-in connection pooler or rely on the serverless driver's connection handling?
- Payload CMS or similar for the pages table — evaluate later or now?
- Should we keep the `suggested_values` table or replace it with Postgres `ENUM` types where applicable?
