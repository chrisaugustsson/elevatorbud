import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { eq, and, inArray } from "drizzle-orm";
import { createClerkClient } from "@clerk/backend";
import { users, userOrganizations, organizations } from "@elevatorbud/db/schema";
import type { Database } from "@elevatorbud/db";
import { adminMiddleware } from "./auth";

function getClerkClient() {
  return createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });
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
  db: Database,
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

    return user;
  });
}

async function deactivateUserFn(db: Database, id: string) {
  const [user] = await db
    .update(users)
    .set({ active: false })
    .where(eq(users.id, id))
    .returning();
  return user;
}

async function activateUserFn(db: Database, id: string) {
  const [user] = await db
    .update(users)
    .set({ active: true })
    .where(eq(users.id, id))
    .returning();
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
  const clerkUser = await clerk.users.createUser({
    emailAddress: [input.email],
    firstName,
    lastName,
    skipPasswordRequirement: true,
  });

  const { organizationIds, ...userFields } = input;

  // Wrap the user insert and organization-grant writes in one transaction so
  // a user row can never end up created without its intended org grants.
  // (Clerk creation sits outside the tx — it's remote and can't join a pg
  // transaction — but the DB writes are atomic between themselves.)
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
}

async function deleteUserFn(db: Database, id: string) {
  const dbUser = await db.query.users.findFirst({ where: eq(users.id, id) });
  if (!dbUser) throw new Error("Användaren hittades inte");

  const clerk = getClerkClient();
  await clerk.users.deleteUser(dbUser.clerkUserId);
  await db.delete(users).where(eq(users.id, id));
  return { deleted: true };
}

// ---------------------------------------------------------------------------
// Server functions
// ---------------------------------------------------------------------------

export const getMe = createServerFn()
  .middleware([adminMiddleware])
  .handler(async ({ context }) => {
    return context.user;
  });

export const getMeOptions = () =>
  queryOptions({
    queryKey: ["user", "me"],
    queryFn: () => getMe(),
  });

export const listUsers = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(listUsersSchema)
  .handler(async ({ data, context }) => {
    return listUsersFn(context.db, data);
  });

export const listUsersOptions = (filters?: z.infer<typeof listUsersSchema>) =>
  queryOptions({
    queryKey: ["user", "list", filters],
    queryFn: () => listUsers({ data: filters }),
  });

export const updateUser = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(updateUserSchema)
  .handler(async ({ data, context }) => {
    return updateUserFn(context.db, data);
  });

export const deactivateUser = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
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
