import { createMiddleware } from "@tanstack/react-start";
import { auth } from "@elevatorbud/auth/server";
import { createDb } from "@elevatorbud/db";
import { users } from "@elevatorbud/db/schema";
import { eq } from "drizzle-orm";
import type { User } from "@elevatorbud/api/types";
import type { Database } from "@elevatorbud/db";

let _db: ReturnType<typeof createDb> | null = null;
function getDb() {
  if (!_db) _db = createDb(process.env.DATABASE_URL!);
  return _db;
}

/**
 * Middleware that requires an authenticated, active admin user.
 * Injects `user` and `db` into server function context.
 */
export const adminMiddleware = createMiddleware().server(async ({ next }) => {
  const { userId } = await auth();
  if (!userId) throw new Error("Ej autentiserad");

  const db = getDb();
  const dbUser = await db.query.users.findFirst({
    where: eq(users.clerkUserId, userId),
  });

  if (!dbUser) throw new Error("Ej autentiserad");
  if (!dbUser.active) throw new Error("Kontot är inaktiverat");
  if (dbUser.role !== "admin") throw new Error("Kräver admin-behörighet");

  const user: User = {
    id: dbUser.id,
    clerkUserId: dbUser.clerkUserId,
    email: dbUser.email,
    name: dbUser.name,
    role: dbUser.role,
    organizationId: dbUser.organizationId,
    active: dbUser.active,
  };

  return next({ context: { user, db } });
});

/** For the auth guard in _authenticated.tsx (returns null instead of throwing) */
export async function getAuthUser(): Promise<User | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const db = getDb();
  const dbUser = await db.query.users.findFirst({
    where: eq(users.clerkUserId, userId),
  });
  if (!dbUser) return null;

  return {
    id: dbUser.id,
    clerkUserId: dbUser.clerkUserId,
    email: dbUser.email,
    name: dbUser.name,
    role: dbUser.role,
    organizationId: dbUser.organizationId,
    active: dbUser.active,
  };
}
