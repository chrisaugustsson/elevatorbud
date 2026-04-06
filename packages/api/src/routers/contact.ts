import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { contactSubmissions } from "@elevatorbud/db/schema";
import type { Database } from "@elevatorbud/db";

// ---------------------------------------------------------------------------
// Input schemas (exported for reuse as server-function validators)
// ---------------------------------------------------------------------------

export const submitContactSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  message: z.string().min(1),
});

export const listContactsSchema = z
  .object({
    status: z.enum(["new", "read", "archived"]).optional(),
  })
  .optional();

export const updateContactStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["new", "read", "archived"]),
});

// ---------------------------------------------------------------------------
// Functions
// ---------------------------------------------------------------------------

export async function unreadCount(db: Database) {
  const result = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(contactSubmissions)
    .where(eq(contactSubmissions.status, "new"));
  return result[0]?.count ?? 0;
}

export async function submit(
  db: Database,
  input: z.infer<typeof submitContactSchema>,
) {
  const [submission] = await db
    .insert(contactSubmissions)
    .values({ ...input, status: "new" })
    .returning();
  return submission;
}

export async function list(
  db: Database,
  filters?: z.infer<typeof listContactsSchema>,
) {
  return db.query.contactSubmissions.findMany({
    where: filters?.status
      ? eq(contactSubmissions.status, filters.status)
      : undefined,
    orderBy: (cs, { desc }) => [desc(cs.createdAt)],
  });
}

export async function updateStatus(
  db: Database,
  input: z.infer<typeof updateContactStatusSchema>,
) {
  const [submission] = await db
    .update(contactSubmissions)
    .set({ status: input.status })
    .where(eq(contactSubmissions.id, input.id))
    .returning();
  return submission;
}
