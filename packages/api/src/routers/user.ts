import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { users } from "@elevatorbud/db/schema";
import type { Database } from "@elevatorbud/db";

// ---------------------------------------------------------------------------
// Input schemas (exported for reuse as server-function validators)
// ---------------------------------------------------------------------------

export const listUsersSchema = z
  .object({
    role: z.enum(["admin", "customer"]).optional(),
    organizationId: z.string().uuid().optional(),
  })
  .optional();

export const updateUserSchema = z.object({
  id: z.string().uuid(),
  role: z.enum(["admin", "customer"]).optional(),
  organizationId: z.string().uuid().nullable().optional(),
  active: z.boolean().optional(),
});

export const upsertFromClerkSchema = z.object({
  clerkUserId: z.string(),
  email: z.string().email(),
  name: z.string(),
});

export const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(["admin", "customer"]).default("customer"),
  organizationId: z.string().uuid().optional(),
});

// ---------------------------------------------------------------------------
// Functions
// ---------------------------------------------------------------------------

export async function me(db: Database, clerkUserId: string) {
  const user = await db.query.users.findFirst({
    where: eq(users.clerkUserId, clerkUserId),
  });
  return user ?? null;
}

export async function list(
  db: Database,
  filters?: z.infer<typeof listUsersSchema>,
) {
  const conditions = [];
  if (filters?.role) conditions.push(eq(users.role, filters.role));
  if (filters?.organizationId)
    conditions.push(eq(users.organizationId, filters.organizationId));

  return db.query.users.findMany({
    where: conditions.length ? and(...conditions) : undefined,
    with: { organization: true },
    orderBy: (u, { asc }) => [asc(u.name)],
  });
}

export async function update(
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

export async function deactivate(db: Database, id: string) {
  const [user] = await db
    .update(users)
    .set({ active: false })
    .where(eq(users.id, id))
    .returning();
  return user;
}

export async function activate(db: Database, id: string) {
  const [user] = await db
    .update(users)
    .set({ active: true })
    .where(eq(users.id, id))
    .returning();
  return user;
}

/** Upsert user from Clerk webhook event. */
export async function upsertFromClerk(
  db: Database,
  input: z.infer<typeof upsertFromClerkSchema>,
) {
  const existing = await db.query.users.findFirst({
    where: eq(users.clerkUserId, input.clerkUserId),
  });

  if (existing) {
    const [user] = await db
      .update(users)
      .set({ email: input.email, name: input.name })
      .where(eq(users.id, existing.id))
      .returning();
    return user;
  }

  const [user] = await db
    .insert(users)
    .values({ ...input, role: "customer", active: true })
    .returning();
  return user;
}

export async function deleteFromClerk(db: Database, clerkUserId: string) {
  const existing = await db.query.users.findFirst({
    where: eq(users.clerkUserId, clerkUserId),
  });
  if (existing) {
    await db.delete(users).where(eq(users.id, existing.id));
  }
  return { deleted: !!existing };
}

/** Create a user from the admin panel (without Clerk). */
export async function create(
  db: Database,
  input: z.infer<typeof createUserSchema>,
) {
  // Generate a placeholder clerkUserId — will be replaced when the user
  // signs up through Clerk and the webhook fires upsertFromClerk.
  const clerkUserId = `pending_${crypto.randomUUID()}`;
  const [user] = await db
    .insert(users)
    .values({ ...input, clerkUserId, active: true })
    .returning();
  return user;
}

/** Delete a user by id (admin panel). */
export async function deleteUser(db: Database, id: string) {
  await db.delete(users).where(eq(users.id, id));
  return { deleted: true };
}
