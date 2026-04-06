import { createMiddleware } from "@tanstack/react-start";
import { auth } from "@clerk/tanstack-react-start/server";
import { createDb } from "@elevatorbud/db";
import { users } from "@elevatorbud/db/schema";
import { eq } from "drizzle-orm";
import type { User } from "@elevatorbud/types";

let _db: ReturnType<typeof createDb> | null = null;
function getDb() {
  if (!_db) _db = createDb(process.env.DATABASE_URL!);
  return _db;
}

async function resolveUser(requiredRole?: "admin" | "customer") {
  const { userId } = await auth();
  if (!userId) throw new Error("Ej autentiserad");

  const db = getDb();
  const dbUser = await db.query.users.findFirst({
    where: eq(users.clerkUserId, userId),
  });

  if (!dbUser) throw new Error("Ej autentiserad");
  if (!dbUser.active) throw new Error("Kontot är inaktiverat");
  if (requiredRole && dbUser.role !== requiredRole) {
    throw new Error("Kräver admin-behörighet");
  }

  const user: User = {
    id: dbUser.id,
    clerkUserId: dbUser.clerkUserId,
    email: dbUser.email,
    name: dbUser.name,
    role: dbUser.role,
    organizationId: dbUser.organizationId,
    active: dbUser.active,
  };

  return { user, db };
}

/**
 * Middleware that requires an authenticated, active admin user.
 * Injects `user` and `db` into server function context.
 */
export const adminMiddleware = createMiddleware().server(async ({ next }) => {
  const { user, db } = await resolveUser("admin");
  return next({ context: { user, db } });
});

/**
 * Middleware that requires an authenticated, active user (any role).
 * Injects `user` and `db` into server function context.
 */
export const authMiddleware = createMiddleware().server(async ({ next }) => {
  const { user, db } = await resolveUser();
  return next({ context: { user, db } });
});

/** For auth guards that return null instead of throwing. */
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
