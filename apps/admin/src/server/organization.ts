import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { eq, inArray, and, not } from "drizzle-orm";
import { organizations, userOrganizations, users } from "@elevatorbud/db/schema";
import type { Database, DatabaseHttp } from "@elevatorbud/db";
import { adminMiddleware, adminMiddlewareRead } from "./auth";

type ReadDb = Database | DatabaseHttp;

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

async function listOrgs(db: ReadDb) {
  return db.query.organizations.findMany({
    orderBy: (orgs, { asc }) => [asc(orgs.name)],
  });
}

async function getOrg(db: ReadDb, id: string) {
  return db.query.organizations.findFirst({
    where: eq(organizations.id, id),
  });
}

/**
 * Enforce the one-level-deep hierarchy rule in the application layer so the
 * admin UI gets a clear user-facing error instead of a raw DB trigger message.
 *
 * Rules (PRD US-001 + US-006):
 *  1. The proposed parent must itself be a root org (`parentId === null`);
 *     an org that already has a parent cannot be chosen as a parent.
 *  2. An org cannot be its own parent.
 */
async function assertValidParent(
  db: Database,
  opts: { parentId: string; selfId?: string },
) {
  if (opts.selfId && opts.parentId === opts.selfId) {
    throw new Error(
      "Kan inte sätta som förälder: en organisation kan inte vara förälder till sig själv.",
    );
  }

  const [parent] = await db
    .select({ id: organizations.id, parentId: organizations.parentId })
    .from(organizations)
    .where(eq(organizations.id, opts.parentId));

  if (!parent) {
    throw new Error(
      "Kan inte sätta som förälder: den valda organisationen finns inte.",
    );
  }

  if (parent.parentId !== null) {
    throw new Error(
      "Kan inte sätta som förälder: organisationen är själv en underorganisation.",
    );
  }
}

/**
 * On UPDATE, if the caller is trying to assign a non-null parent to an org
 * that already has children, reject — that would create a two-level chain.
 */
async function assertHasNoChildren(db: Database, selfId: string) {
  const children = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.parentId, selfId))
    .limit(1);

  if (children.length > 0) {
    throw new Error(
      "Kan inte tilldela en förälder: organisationen har redan underorganisationer och kan inte själv bli en underorganisation.",
    );
  }
}

async function createOrg(
  db: Database,
  input: z.infer<typeof createOrganizationSchema>,
) {
  if (input.parentId) {
    await assertValidParent(db, { parentId: input.parentId });
  }

  const [org] = await db.insert(organizations).values(input).returning();
  return org;
}

async function updateOrg(
  db: Database,
  input: z.infer<typeof updateOrganizationSchema>,
) {
  const { id, ...data } = input;

  if (data.parentId) {
    // Validate the proposed parent is itself a root org (not already a child).
    await assertValidParent(db, { parentId: data.parentId, selfId: id });
    // Validate that this org does not already have children; if it does,
    // demoting it to a child would create a two-level chain.
    await assertHasNoChildren(db, id);
  }

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
  .middleware([adminMiddlewareRead])
  .handler(async ({ context }) => {
    return listOrgs(context.db);
  });

export const listOrganizationsOptions = () =>
  queryOptions({
    queryKey: ["organization", "list"],
    queryFn: () => listOrganizations(),
  });

export const getOrganization = createServerFn()
  .middleware([adminMiddlewareRead])
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

// ---------------------------------------------------------------------------
// Preview parent change impact on user access
// ---------------------------------------------------------------------------

const previewParentChangeSchema = z.object({
  orgId: z.string().uuid(),
  oldParentId: z.string().uuid().nullable(),
  newParentId: z.string().uuid().nullable(),
});

export type AffectedUser = { id: string; name: string; email: string };

/**
 * Pure partition logic — extracted so the dedupe can be unit-tested without
 * spinning up a DB. A user who holds direct grants on BOTH the old and the
 * new parent has no net access change (they inherit the moved org via the
 * new parent exactly as they previously did via the old one). A user with a
 * direct grant on the moved org itself also has no net change — direct
 * always beats inherited. Without this dedupe such users would double-report
 * in both gained AND lost.
 */
export function partitionParentChangeImpact(
  oldParentUsers: AffectedUser[],
  newParentUsers: AffectedUser[],
  directUserIds: Iterable<string>,
): { gained: AffectedUser[]; lost: AffectedUser[] } {
  const directSet = new Set(directUserIds);
  const oldIds = new Set(oldParentUsers.map((u) => u.id));
  const newIds = new Set(newParentUsers.map((u) => u.id));

  const lost = oldParentUsers.filter(
    (u) => !directSet.has(u.id) && !newIds.has(u.id),
  );
  const gained = newParentUsers.filter(
    (u) => !directSet.has(u.id) && !oldIds.has(u.id),
  );

  return { gained, lost };
}

async function computeParentChangeImpact(
  db: Database,
  input: z.infer<typeof previewParentChangeSchema>,
) {
  const { orgId, oldParentId, newParentId } = input;

  if (oldParentId === newParentId) return { gained: [], lost: [] };

  const directGrantUserIds = await db
    .select({ userId: userOrganizations.userId })
    .from(userOrganizations)
    .where(eq(userOrganizations.organizationId, orgId));

  let oldParentUsers: AffectedUser[] = [];
  let newParentUsers: AffectedUser[] = [];

  if (oldParentId) {
    oldParentUsers = await db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .innerJoin(userOrganizations, eq(users.id, userOrganizations.userId))
      .where(eq(userOrganizations.organizationId, oldParentId));
  }

  if (newParentId) {
    newParentUsers = await db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .innerJoin(userOrganizations, eq(users.id, userOrganizations.userId))
      .where(eq(userOrganizations.organizationId, newParentId));
  }

  return partitionParentChangeImpact(
    oldParentUsers,
    newParentUsers,
    directGrantUserIds.map((r) => r.userId),
  );
}

export const previewParentChange = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(previewParentChangeSchema)
  .handler(async ({ data, context }) => {
    return computeParentChangeImpact(context.db, data);
  });
