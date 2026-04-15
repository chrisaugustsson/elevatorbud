import { createMiddleware } from "@tanstack/react-start";
import { auth } from "@clerk/tanstack-react-start/server";
import { createDb } from "@elevatorbud/db";
import { users, userOrganizations } from "@elevatorbud/db/schema";
import { eq } from "drizzle-orm";
import type { User } from "@elevatorbud/types";

let _db: ReturnType<typeof createDb> | null = null;
function getDb() {
  if (!_db) _db = createDb(process.env.DATABASE_URL!);
  return _db;
}

// Short-TTL cache keyed by Clerk user ID. TanStack Start middleware runs per
// server-fn invocation with no shared request object we can hang a WeakMap
// off, so a 5-second TTL is the pragmatic alternative: a single HTTP request
// usually fires several server fns in rapid succession, and caching for 5s
// collapses those to one Clerk+DB hit while keeping the staleness window far
// shorter than any meaningful permission change. Active/role changes take
// effect at most 5s later on the next server-fn call (sooner when the
// mutating server-fn explicitly invalidates — see invalidateUserCacheByDbId).
const USER_CACHE_TTL_MS = 5_000;
type CachedUser = { user: User; expiresAt: number };
const userCache = new Map<string, CachedUser>();

/**
 * Drop the cache entry for one user, keyed by their internal DB id. Call this
 * from any server-fn that mutates the user row or their org grants so the
 * same worker serves fresh data on the next request instead of waiting out
 * the 5s TTL. Other workers still wait out the TTL — this is a fast-path
 * invalidation, not a distributed one, and the short TTL is the real ceiling.
 */
export function invalidateUserCacheByDbId(dbUserId: string): void {
  for (const [clerkId, entry] of userCache) {
    if (entry.user.id === dbUserId) {
      userCache.delete(clerkId);
    }
  }
}

/** Drop the cache entry by Clerk user ID (used by Clerk webhooks). */
export function invalidateUserCacheByClerkId(clerkUserId: string): void {
  userCache.delete(clerkUserId);
}

async function resolveUser(requiredRole?: "admin" | "customer") {
  const { userId } = await auth();
  if (!userId) throw new Error("Ej autentiserad");

  const db = getDb();
  const now = Date.now();
  const cached = userCache.get(userId);

  let user: User;
  if (cached && cached.expiresAt > now) {
    user = cached.user;
  } else {
    const dbUser = await db.query.users.findFirst({
      where: eq(users.clerkUserId, userId),
    });

    if (!dbUser) throw new Error("Ej autentiserad");
    if (!dbUser.active) throw new Error("Kontot är inaktiverat");

    const orgRows = await db
      .select({ organizationId: userOrganizations.organizationId })
      .from(userOrganizations)
      .where(eq(userOrganizations.userId, dbUser.id));

    user = {
      id: dbUser.id,
      clerkUserId: dbUser.clerkUserId,
      email: dbUser.email,
      name: dbUser.name,
      role: dbUser.role,
      organizationIds: orgRows.map((r) => r.organizationId),
      active: dbUser.active,
    };

    userCache.set(userId, { user, expiresAt: now + USER_CACHE_TTL_MS });
  }

  // Role check runs against cached OR fresh user — cheap and cache-safe.
  if (requiredRole && user.role !== requiredRole) {
    throw new Error("Kräver admin-behörighet");
  }
  if (!user.active) throw new Error("Kontot är inaktiverat");

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

  const orgRows = await db
    .select({ organizationId: userOrganizations.organizationId })
    .from(userOrganizations)
    .where(eq(userOrganizations.userId, dbUser.id));

  return {
    id: dbUser.id,
    clerkUserId: dbUser.clerkUserId,
    email: dbUser.email,
    name: dbUser.name,
    role: dbUser.role,
    organizationIds: orgRows.map((r) => r.organizationId),
    active: dbUser.active,
  };
}
