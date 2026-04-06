import { z } from "zod";
import { eq } from "drizzle-orm";
import { organizations } from "@elevatorbud/db/schema";
import type { Database } from "@elevatorbud/db";

// ---------------------------------------------------------------------------
// Input schemas (exported for reuse as server-function validators)
// ---------------------------------------------------------------------------

export const createOrganizationSchema = z.object({
  name: z.string().min(1),
  organizationNumber: z.string().optional(),
  contactPerson: z.string().optional(),
  phoneNumber: z.string().optional(),
  email: z.string().email().optional(),
});

export const updateOrganizationSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).optional(),
  organizationNumber: z.string().optional(),
  contactPerson: z.string().optional(),
  phoneNumber: z.string().optional(),
  email: z.string().email().optional(),
});

// ---------------------------------------------------------------------------
// Functions
// ---------------------------------------------------------------------------

export async function list(db: Database) {
  return db.query.organizations.findMany({
    orderBy: (orgs, { asc }) => [asc(orgs.name)],
  });
}

export async function get(db: Database, id: string) {
  return db.query.organizations.findFirst({
    where: eq(organizations.id, id),
  });
}

export async function create(
  db: Database,
  input: z.infer<typeof createOrganizationSchema>,
) {
  const [org] = await db.insert(organizations).values(input).returning();
  return org;
}

export async function update(
  db: Database,
  input: z.infer<typeof updateOrganizationSchema>,
) {
  const { id, ...data } = input;
  const [org] = await db
    .update(organizations)
    .set(data)
    .where(eq(organizations.id, id))
    .returning();
  return org;
}
