This project uses Neon Postgres with Drizzle ORM and TanStack Start server functions.

- **Database:** `packages/db/` — Drizzle schema, connection (Neon HTTP), migrations
- **Auth:** `packages/auth/` — Clerk auth (client exports, server middleware). Shared `adminMiddleware` and `authMiddleware` live here.
- **Types:** `packages/types/` — Shared type definitions (User, etc.)
- **Apps:** Each app has its own server functions at `src/server/*.ts` with query logic inlined directly
  - **Admin app** — For Hisskompetens staff. Sees all data. No org-scoping (organizationId is an optional filter when viewing a specific org).
  - **Client app** — For customer users. ALWAYS scoped to `context.user.organizationId`. Every query must filter by the user's org.
  - **Landing app** — Public website. No auth.
- **Local dev:** `docker compose up -d` starts Postgres 16, then `pnpm db:migrate` to run migrations
