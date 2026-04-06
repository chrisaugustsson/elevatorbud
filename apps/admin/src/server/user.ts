import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { users } from "@elevatorbud/db/schema";
import type { Database } from "@elevatorbud/db";
import { adminMiddleware } from "./auth";

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

// ---------------------------------------------------------------------------
// Inlined query logic
// Admin sees ALL users — no org scoping.
// ---------------------------------------------------------------------------

async function listUsersFn(
  db: Database,
  filters?: z.infer<typeof listUsersSchema>,
) {
  const conditions = [];
  if (filters?.role) conditions.push(eq(users.role, filters.role));
  if (filters?.organizationId) {
    conditions.push(eq(users.organizationId, filters.organizationId));
  }

  return db.query.users.findMany({
    where: conditions.length ? and(...conditions) : undefined,
    with: { organization: true },
    orderBy: (u, { asc }) => [asc(u.name)],
  });
}

async function updateUserFn(
  db: Database,
  input: z.infer<typeof updateUserSchema>,
) {
  const { id, ...data } = input;
  const [user] = await db
    .update(users)
    .set(data)
    .where(eq(users.id, id))
    .returning();
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
  const clerkUserId = `pending_${crypto.randomUUID()}`;
  const [user] = await db
    .insert(users)
    .values({ ...input, clerkUserId, active: true })
    .returning();
  return user;
}

async function deleteUserFn(db: Database, id: string) {
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
