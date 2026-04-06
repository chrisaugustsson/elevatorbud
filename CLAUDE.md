This project uses Neon Postgres with Drizzle ORM and tRPC.

- **Database:** `packages/db/` — Drizzle schema, connection (Neon HTTP + node-postgres), migrations
- **API:** `packages/api/` — tRPC routers (auth-agnostic, receives pre-verified context)
- **Apps:** Each app has a BFF at `src/server/trpc.ts` that verifies Clerk JWT and creates the tRPC context
- **Local dev:** `docker compose up -d` starts Postgres 16, then `pnpm db:migrate` to run migrations
