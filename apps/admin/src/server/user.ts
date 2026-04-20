import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { eq, and, inArray } from "drizzle-orm";
import { createClerkClient } from "@clerk/backend";
import { users, userOrganizations, organizations } from "@elevatorbud/db/schema";
import type { Database, DatabaseHttp } from "@elevatorbud/db";
import {
  adminMiddleware,
  adminMiddlewareRead,
  invalidateUserCacheByDbId,
  invalidateUserCacheByClerkId,
} from "./auth";

type ReadDb = Database | DatabaseHttp;

function getClerkClient() {
  return createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });
}

// ---------------------------------------------------------------------------
// Clerk error translation
//
// Clerk's `ClerkAPIResponseError` carries its useful payload on `.errors[]`
// (code, message, longMessage). TanStack Start serializes thrown errors via
// Seroval's ShallowErrorPlugin, which only preserves `name` and `message` —
// so by the time the browser deserializes, all that survives is the HTTP
// status text (e.g. "Unprocessable Entity"). Duck-type the shape (no
// @clerk/shared import needed) and translate to a plain Error the admin UI
// can actually surface.
// ---------------------------------------------------------------------------

type ClerkApiError = Error & {
  errors: Array<{ code: string; message: string; longMessage?: string }>;
};

function isClerkApiError(err: unknown): err is ClerkApiError {
  if (!(err instanceof Error)) return false;
  const errors = (err as ClerkApiError).errors;
  return (
    Array.isArray(errors) &&
    errors.every(
      (e) =>
        typeof e === "object" &&
        e !== null &&
        typeof (e as { code: unknown }).code === "string",
    )
  );
}

function translateClerkError(err: unknown): Error {
  if (!isClerkApiError(err)) {
    return err instanceof Error ? err : new Error(String(err));
  }
  const first = err.errors[0];
  if (!first) {
    return new Error("Kunde inte skapa användaren i inloggningssystemet.");
  }
  switch (first.code) {
    case "form_identifier_exists":
      return new Error(
        "En användare med den här e-postadressen finns redan i inloggningssystemet.",
      );
    default:
      return new Error(
        first.longMessage ??
          first.message ??
          "Kunde inte skapa användaren i inloggningssystemet.",
      );
  }
}

// ---------------------------------------------------------------------------
// Zod schemas (inlined from packages/api/src/routers/user.ts)
// ---------------------------------------------------------------------------

const listUsersSchema = z
  .object({
    role: z.enum(["admin", "customer"]).optional(),
    organizationId: z.string().uuid().optional(),
  })
  .optional();

const updateUserSchema = z.object({
  id: z.string().uuid(),
  role: z.enum(["admin", "customer"]).optional(),
  organizationIds: z.array(z.string().uuid()).optional(),
  active: z.boolean().optional(),
});

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(["admin", "customer"]).default("customer"),
  organizationIds: z.array(z.string().uuid()).optional(),
});

type UserWithOrgs = typeof users.$inferSelect & {
  userOrganizations: Array<{
    organizationId: string;
    organization: typeof organizations.$inferSelect;
  }>;
};

// ---------------------------------------------------------------------------
// Inlined query logic
// Admin sees ALL users — no org scoping.
// ---------------------------------------------------------------------------

async function listUsersFn(
  db: ReadDb,
  filters?: z.infer<typeof listUsersSchema>,
) {
  if (filters?.organizationId) {
    const userIds = await db
      .select({ userId: userOrganizations.userId })
      .from(userOrganizations)
      .where(eq(userOrganizations.organizationId, filters.organizationId));

    const conditions = [
      inArray(
        users.id,
        userIds.map((r) => r.userId),
      ),
    ];
    if (filters?.role) conditions.push(eq(users.role, filters.role));

    if (userIds.length === 0) return [];

    return db.query.users.findMany({
      where: and(...conditions),
      with: { userOrganizations: { with: { organization: true } } },
      orderBy: (u, { asc }) => [asc(u.name)],
    });
  }

  const conditions = [];
  if (filters?.role) conditions.push(eq(users.role, filters.role));

  return db.query.users.findMany({
    where: conditions.length ? and(...conditions) : undefined,
    with: { userOrganizations: { with: { organization: true } } },
    orderBy: (u, { asc }) => [asc(u.name)],
  });
}

/**
 * Enforce FR-33 server-side: granting a user access to both a parent org AND
 * one of its sub-orgs is redundant and must be rejected. The UI blocks this
 * but a direct server-fn call would otherwise bypass it.
 *
 * Must be called INSIDE the transaction that writes userOrganizations so a
 * violation rolls back cleanly.
 */
async function assertNoParentChildOverlap(
  tx: Parameters<Parameters<Database["transaction"]>[0]>[0],
  organizationIds: string[],
) {
  if (organizationIds.length < 2) return;

  // Lock the candidate org rows in FOR SHARE mode so a concurrent admin
  // cannot change any `parentId` in this set between the overlap check and
  // the userOrganizations insert. FOR SHARE blocks writers but allows
  // concurrent readers (other FR-33 checks), and the ORDER BY id gives a
  // canonical lock order so two concurrent overlap checks cannot deadlock.
  await tx
    .select({ id: organizations.id })
    .from(organizations)
    .where(inArray(organizations.id, organizationIds))
    .orderBy(organizations.id)
    .for("share");

  const overlap = await tx
    .select({ id: organizations.id })
    .from(organizations)
    .where(
      and(
        inArray(organizations.id, organizationIds),
        inArray(organizations.parentId, organizationIds),
      ),
    )
    .limit(1);
  if (overlap.length > 0) {
    throw new Error(
      "Cannot grant access to both a parent organization and its sub-organization. Remove the redundant grant.",
    );
  }
}

async function updateUserFn(
  db: Database,
  input: z.infer<typeof updateUserSchema>,
) {
  const { id, organizationIds, ...data } = input;

  // Wrap both the user update and the replace-all user-organization writes
  // in a single transaction. Without it, a mid-flight failure after the
  // delete but before the insert would leave the user with no org rows at
  // all (effectively orphaned from their grants).
  return await db.transaction(async (tx) => {
    if (organizationIds !== undefined) {
      await assertNoParentChildOverlap(tx, organizationIds);
    }

    const [user] = await tx
      .update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();

    // Guard against touching userOrganizations for a user that no longer
    // exists — otherwise the delete silently runs against an absent userId
    // and a subsequent insert would FK-fail without a clear message.
    if (!user) {
      throw new Error("Användaren hittades inte");
    }

    if (organizationIds !== undefined) {
      await tx
        .delete(userOrganizations)
        .where(eq(userOrganizations.userId, id));

      if (organizationIds.length > 0) {
        await tx.insert(userOrganizations).values(
          organizationIds.map((orgId) => ({
            userId: id,
            organizationId: orgId,
          })),
        );
      }
    }

    // Role, active flag, or org grants just changed. Drop the cached User
    // so the next server-fn call on this worker reflects the change instead
    // of waiting out the 5s TTL.
    invalidateUserCacheByDbId(user.id);
    return user;
  });
}

async function deactivateUserFn(db: Database, id: string) {
  const [user] = await db
    .update(users)
    .set({ active: false })
    .where(eq(users.id, id))
    .returning();
  if (user) invalidateUserCacheByDbId(user.id);
  return user;
}

async function activateUserFn(db: Database, id: string) {
  const [user] = await db
    .update(users)
    .set({ active: true })
    .where(eq(users.id, id))
    .returning();
  if (user) invalidateUserCacheByDbId(user.id);
  return user;
}

async function createUserFn(
  db: Database,
  input: z.infer<typeof createUserSchema>,
) {
  const nameParts = input.name.trim().split(/\s+/);
  const firstName = nameParts[0];
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : undefined;

  const clerk = getClerkClient();
  const { organizationIds, ...userFields } = input;

  // Create a new Clerk identity, or adopt an existing one when the email is
  // already in Clerk but has drifted away from our DB (e.g. the DB was
  // reset while Clerk was not). Email is unique per Clerk instance, so
  // `form_identifier_exists` + lookup by email uniquely identifies the right
  // user — no guesswork.
  let clerkUser: Awaited<ReturnType<typeof clerk.users.createUser>>;
  let adoptedExistingClerkUser = false;

  try {
    clerkUser = await clerk.users.createUser({
      emailAddress: [input.email],
      firstName,
      lastName,
      skipPasswordRequirement: true,
    });
  } catch (err) {
    const identifierExists =
      isClerkApiError(err) &&
      err.errors.some((e) => e.code === "form_identifier_exists");
    if (!identifierExists) throw translateClerkError(err);

    const { data: matches } = await clerk.users.getUserList({
      emailAddress: [input.email],
    });
    // Defensive: Clerk just told us the identifier exists, so exactly one
    // match is expected. Anything else — fall back to the original error.
    if (matches.length !== 1) throw translateClerkError(err);

    const candidate = matches[0]!;

    // If the DB already has a row pointing at this Clerk user, this is not
    // drift — it's a real duplicate attempt. Surface a clear message.
    const existingDbRow = await db.query.users.findFirst({
      where: eq(users.clerkUserId, candidate.id),
    });
    if (existingDbRow) {
      throw new Error("En användare med den här e-postadressen finns redan.");
    }

    clerkUser = candidate;
    adoptedExistingClerkUser = true;
  }

  // Clerk creation sits outside the tx — it's remote and can't join a pg
  // transaction. If the DB writes fail:
  //   - and we CREATED the Clerk user here → roll it back (best-effort), so
  //     we don't leave an orphaned Clerk identity the admin UI can't see.
  //   - and we ADOPTED an existing one → leave it alone. It predates this
  //     request and deleting it could wipe a real identity.
  try {
    return await db.transaction(async (tx) => {
      if (organizationIds && organizationIds.length > 0) {
        await assertNoParentChildOverlap(tx, organizationIds);
      }

      const [user] = await tx
        .insert(users)
        .values({ ...userFields, clerkUserId: clerkUser.id, active: true })
        .returning();

      if (organizationIds && organizationIds.length > 0) {
        await tx.insert(userOrganizations).values(
          organizationIds.map((orgId) => ({
            userId: user.id,
            organizationId: orgId,
          })),
        );
      }

      return user;
    });
  } catch (err) {
    if (!adoptedExistingClerkUser) {
      await clerk.users.deleteUser(clerkUser.id).catch(() => {
        // Best-effort cleanup. If this fails too, the Clerk user stays orphaned,
        // but the original error is what the admin needs to see.
      });
    }
    throw err;
  }
}

async function deleteUserFn(db: Database, id: string) {
  const dbUser = await db.query.users.findFirst({ where: eq(users.id, id) });
  if (!dbUser) throw new Error("Användaren hittades inte");

  // Delete the DB row first. If the Clerk call then fails, the stale Clerk
  // identity can still be cleaned up from Clerk's own admin UI — the reverse
  // (Clerk gone, DB row alive) leaves a row the admin can't re-delete without
  // hitting a 404 from Clerk every time.
  await db.delete(users).where(eq(users.id, id));
  invalidateUserCacheByClerkId(dbUser.clerkUserId);
  invalidateUserCacheByDbId(dbUser.id);

  const clerk = getClerkClient();
  await clerk.users.deleteUser(dbUser.clerkUserId);
  return { deleted: true };
}

// ---------------------------------------------------------------------------
// Server functions
// ---------------------------------------------------------------------------

export const getMe = createServerFn()
  .middleware([adminMiddlewareRead])
  .handler(async ({ context }) => {
    return context.user;
  });

export const getMeOptions = () =>
  queryOptions({
    queryKey: ["user", "me"],
    queryFn: () => getMe(),
  });

export const listUsers = createServerFn({ method: "POST" })
  .middleware([adminMiddlewareRead])
  .inputValidator(listUsersSchema)
  .handler(async ({ data, context }) => {
    return listUsersFn(context.db, data);
  });

export const listUsersOptions = (filters?: z.infer<typeof listUsersSchema>) =>
  queryOptions({
    queryKey: ["user", "list", filters],
    queryFn: () => listUsers({ data: filters }),
  });

// Self-action lockout guard — admins must not be able to revoke their own
// access or delete their own row via the admin UI. A legitimate "leave the
// team" flow would go through a different, reviewed path.
function assertNotSelf(
  targetUserId: string,
  actingUserId: string,
  action: string,
) {
  if (targetUserId === actingUserId) {
    throw new Error(
      `Du kan inte ${action} ditt eget konto. Be en annan administratör att göra det.`,
    );
  }
}

export const updateUser = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(updateUserSchema)
  .handler(async ({ data, context }) => {
    // Block the two self-actions that could lock the admin out. Changing own
    // name/email is harmless and goes through a different path anyway — this
    // endpoint only touches role/active/organizationIds.
    if (data.id === context.user.id) {
      if (data.role !== undefined && data.role !== context.user.role) {
        assertNotSelf(data.id, context.user.id, "ändra roll på");
      }
      if (data.active === false) {
        assertNotSelf(data.id, context.user.id, "inaktivera");
      }
    }
    return updateUserFn(context.db, data);
  });

export const deactivateUser = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    assertNotSelf(data.id, context.user.id, "inaktivera");
    return deactivateUserFn(context.db, data.id);
  });

export const activateUser = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    return activateUserFn(context.db, data.id);
  });

export const createUser = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(createUserSchema)
  .handler(async ({ data, context }) => {
    return createUserFn(context.db, data);
  });

export const deleteUser = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    assertNotSelf(data.id, context.user.id, "radera");
    return deleteUserFn(context.db, data.id);
  });

export const getChildOrganizations = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(z.object({ parentIds: z.array(z.string().uuid()) }))
  .handler(async ({ data, context }) => {
    if (data.parentIds.length === 0) return [];
    return context.db
      .select({ id: organizations.id, name: organizations.name, parentId: organizations.parentId })
      .from(organizations)
      .where(inArray(organizations.parentId, data.parentIds));
  });

export const getChildOrganizationsOptions = (parentIds: string[]) =>
  queryOptions({
    queryKey: ["organization", "children", parentIds],
    queryFn: () => getChildOrganizations({ data: { parentIds } }),
    enabled: parentIds.length > 0,
  });
