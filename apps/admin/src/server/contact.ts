import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { contactSubmissions } from "@elevatorbud/db/schema";
import type { Database } from "@elevatorbud/db";
import { adminMiddleware } from "./auth";

// ---------------------------------------------------------------------------
// Zod schemas (inlined from packages/api/src/routers/contact.ts)
// ---------------------------------------------------------------------------

const listContactsSchema = z
  .object({
    status: z.enum(["new", "read", "archived"]).optional(),
  })
  .optional();

const updateContactStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["new", "read", "archived"]),
});

// ---------------------------------------------------------------------------
// Inlined query logic — no org scoping (contact submissions are global).
// ---------------------------------------------------------------------------

async function unreadCount(db: Database) {
  const result = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(contactSubmissions)
    .where(eq(contactSubmissions.status, "new"));
  return result[0]?.count ?? 0;
}

async function listContacts(
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

async function updateStatus(
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

// ---------------------------------------------------------------------------
// Server functions
// ---------------------------------------------------------------------------

export const getUnreadCount = createServerFn()
  .middleware([adminMiddleware])
  .handler(async ({ context }) => {
    return unreadCount(context.db);
  });

export const unreadCountOptions = () =>
  queryOptions({
    queryKey: ["contact", "unreadCount"],
    queryFn: () => getUnreadCount(),
  });

export const listContactsFn = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(listContactsSchema)
  .handler(async ({ data, context }) => {
    return listContacts(context.db, data);
  });

export const listContactsOptions = (
  filters?: z.infer<typeof listContactsSchema>,
) =>
  queryOptions({
    queryKey: ["contact", "list", filters],
    queryFn: () => listContactsFn({ data: filters }),
  });

export const updateContactStatus = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(updateContactStatusSchema)
  .handler(async ({ data, context }) => {
    return updateStatus(context.db, data);
  });
