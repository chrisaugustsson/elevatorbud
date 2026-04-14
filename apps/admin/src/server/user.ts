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
  organizationId: z.string().uuid().nullable().optional(),
  active: z.boolean().optional(),
});

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(["admin", "customer"]).default("customer"),
  organizationId: z.string().uuid().optional(),
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

async function updateUserFn(
  db: Database,
  input: z.infer<typeof updateUserSchema>,
) {
  const { id, organizationId, ...data } = input;

  const [user] = await db
    .update(users)
    .set(data)
    .where(eq(users.id, id))
    .returning();

  if (organizationId !== undefined) {
    await db
      .delete(userOrganizations)
      .where(eq(userOrganizations.userId, id));

    if (organizationId) {
      await db.insert(userOrganizations).values({
        userId: id,
        organizationId,
      });
    }
  }

  return user;
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

  const { organizationId, ...userFields } = input;
  const [user] = await db
    .insert(users)
    .values({ ...userFields, clerkUserId: clerkUser.id, active: true })
    .returning();

  if (organizationId) {
    await db.insert(userOrganizations).values({
      userId: user.id,
      organizationId,
    });
  }

  return user;
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
