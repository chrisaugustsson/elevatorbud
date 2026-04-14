import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { organizations } from "@elevatorbud/db/schema";
import type { Database } from "@elevatorbud/db";
import { adminMiddleware } from "./auth";

// ---------------------------------------------------------------------------
// Zod schemas (inlined from packages/api/src/routers/organization.ts)
// ---------------------------------------------------------------------------

const createOrganizationSchema = z.object({
  name: z.string().min(1),
  organizationNumber: z.string().optional(),
  parentId: z.string().uuid().nullable().optional(),
});

const updateOrganizationSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).optional(),
  organizationNumber: z.string().optional(),
  parentId: z.string().uuid().nullable().optional(),
});

// ---------------------------------------------------------------------------
// Inlined query logic
// Admin sees ALL organizations — no org scoping.
// ---------------------------------------------------------------------------

async function listOrgs(db: Database) {
  return db.query.organizations.findMany({
    orderBy: (orgs, { asc }) => [asc(orgs.name)],
  });
}

async function getOrg(db: Database, id: string) {
  return db.query.organizations.findFirst({
    where: eq(organizations.id, id),
  });
}

async function createOrg(
  db: Database,
  input: z.infer<typeof createOrganizationSchema>,
) {
  const [org] = await db.insert(organizations).values(input).returning();
  return org;
}

async function updateOrg(
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

// ---------------------------------------------------------------------------
// Server functions
// ---------------------------------------------------------------------------

export const listOrganizations = createServerFn()
  .middleware([adminMiddleware])
  .handler(async ({ context }) => {
    return listOrgs(context.db);
  });

export const listOrganizationsOptions = () =>
  queryOptions({
    queryKey: ["organization", "list"],
    queryFn: () => listOrganizations(),
  });

export const getOrganization = createServerFn()
  .middleware([adminMiddleware])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    return getOrg(context.db, data.id);
  });

export const organizationOptions = (id: string) =>
  queryOptions({
    queryKey: ["organization", id],
    queryFn: () => getOrganization({ data: { id } }),
  });

export const createOrganization = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(createOrganizationSchema)
  .handler(async ({ data, context }) => {
    return createOrg(context.db, data);
  });

export const updateOrganization = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(updateOrganizationSchema)
  .handler(async ({ data, context }) => {
    return updateOrg(context.db, data);
  });
